<?php
/**
 * AI Answer API (RAG-ready)
 * - Accepts JSON: { question: string, history?: [...], preferences?: {...}, topK?: number }
 * - Optionally retrieves context from Postgres pgvector knowledge base
 * - Calls OpenAI for an answer with provided context and returns JSON
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
checkRateLimit();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    $question = trim((string)($input['question'] ?? ''));
    if ($question === '') {
        sendJsonResponse(null, 400, 'Question is required');
    }

    $topK = isset($input['topK']) ? max(1, min(8, (int)$input['topK'])) : 4;
    $history = is_array($input['history'] ?? null) ? $input['history'] : [];
    $preferences = is_array($input['preferences'] ?? null) ? $input['preferences'] : [];
    $visitor = is_array($input['visitor'] ?? null) ? $input['visitor'] : [];
    $visitorEmail = strtolower(trim((string)($visitor['email'] ?? '')));

    // Merge learned preferences from past sessions for the same email (if available)
    if ($visitorEmail !== '') {
        try {
            $learned = getLearnedPreferences($visitorEmail);
            if (is_array($learned) && !empty($learned)) {
                $preferences = mergePreferences($preferences, $learned);
            }
        } catch (Exception $e) {
            logEvent('warning', 'learned preferences fetch failed', [ 'error' => $e->getMessage(), 'email' => $visitorEmail ]);
        }
    }

    // 0) Try forwarding to FastAPI FAQ Bot first if configured
    $faqBotBase = getenv('FAQ_BOT_URL') ?: (defined('FAQ_BOT_URL') ? FAQ_BOT_URL : null);
    if ($faqBotBase) {
        try {
            $faqUrl = rtrim($faqBotBase, '/').'/ask';
            $payload = json_encode([
                'question' => $question,
                'history' => $history,
                'preferences' => $preferences,
            ], JSON_UNESCAPED_UNICODE);

            $resp = httpPostJson($faqUrl, $payload, [ 'Content-Type: application/json' ]);
            $data = json_decode($resp, true);
            if (isset($data['answer'])) {
                sendJsonResponse([
                    'answer' => $data['answer'],
                    'score' => $data['score'] ?? null,
                    'provider' => 'faq_bot'
                ], 200, 'OK');
            }
        } catch (Exception $e) {
            // Log and continue to RAG fallback
            logEvent('warning', 'faq_bot forward failed', [ 'error' => $e->getMessage() ]);
        }
    }

    $openaiKey = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : getenv('OPENAI_API_KEY');
    if (!$openaiKey) {
        sendJsonResponse(null, 500, 'OpenAI API key not configured');
    }

    // 1) Optional RAG retrieval from Postgres if pgvector and tables exist
    $contextBlocks = [];
    try {
        $db = getDbConnection();
        // Attempt embedding via OpenAI first
        $embed = openaiEmbedding($openaiKey, $question);
        if ($embed && is_array($embed)) {
            // Query topK similar chunks
            $sql = "SELECT doc_id, chunk_index, content, similarity
                    FROM (
                      SELECT doc_id, chunk_index, content,
                             1 - (embedding <=> CAST(:vec AS vector)) AS similarity
                      FROM knowledge_chunks
                    ) q
                    ORDER BY similarity DESC
                    LIMIT :k";
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':vec', vectorToPg($embed), PDO::PARAM_STR);
            $stmt->bindValue(':k', $topK, PDO::PARAM_INT);
            $stmt->execute();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $contextBlocks[] = $row['content'];
            }
        }
    } catch (Exception $e) {
        // Retrieval is optional; continue without RAG if any error
        logEvent('warning', 'RAG retrieval skipped', [ 'error' => $e->getMessage() ]);
    }

    // 2) Build system prompt and user message
    $system = "You are Gisu Safaris AI assistant.\n"
            . "- Prioritize Uganda first, then other African countries.\n"
            . "- Be polite, friendly, adventurous; avoid negative phrasing.\n"
            . "- Use fresh data where possible.\n"
            . "- You may answer broader travel or general questions the visitor asks, but when appropriate gently relate your answer back to African travel and how Gisu Safaris can help.\n"
            . "- When unsure, say so and propose next steps.\n";

    $ragContext = '';
    if (!empty($contextBlocks)) {
        $ragContext = "\nRelevant knowledge base context:\n" . implode("\n---\n", array_map(function($c){
            return mb_substr($c, 0, 1200);
        }, $contextBlocks));
    }

    $historyText = '';
    if (!empty($history)) {
        $parts = [];
        foreach ($history as $m) {
            if (!is_array($m)) continue;
            $sender = strtolower($m['sender'] ?? '');
            $msg = (string)($m['message'] ?? '');
            if ($msg === '') continue;
            $prefix = $sender === 'user' ? 'User: ' : 'Assistant: ';
            $parts[] = $prefix . $msg;
        }
        if (!empty($parts)) $historyText = "\nConversation so far:\n" . implode("\n", $parts);
    }

    $prefText = '';
    if (!empty($preferences)) {
        $prefText = "\nUser preferences: " . json_encode($preferences);
    }

    $globalQAContext = '';
    try {
        $qaPairs = getGlobalQAPairs($question, 4);
        if (!empty($qaPairs)) {
            $parts = [];
            foreach ($qaPairs as $qa) {
                $parts[] = "Q: " . $qa['q'] . "\nA: " . $qa['a'];
            }
            $globalQAContext = "\nPrevious visitor Q&A that may help:\n" . implode("\n---\n", $parts);
        }
    } catch (Exception $e) {
        logEvent('warning', 'global QA fetch failed', [ 'error' => $e->getMessage() ]);
    }

    $userContent = "Question: " . $question . $prefText . $historyText . $ragContext . $globalQAContext;

    // 3) Call OpenAI Chat Completions (gpt-4o-mini default)
    $model = getenv('OPENAI_MODEL') ?: (defined('OPENAI_MODEL') ? OPENAI_MODEL : 'gpt-4o-mini');
    $answer = openaiChat($openaiKey, $model, $system, $userContent);

    sendJsonResponse([
        'answer' => $answer,
        'rag_used' => !empty($contextBlocks),
        'contexts' => $contextBlocks,
        'model' => $model
    ], 200, 'OK');

} catch (Exception $e) {
    logEvent('error', 'ai_answer failure', [ 'error' => $e->getMessage() ]);
    sendJsonResponse(null, 500, 'Server error');
}

// Helpers
function openaiEmbedding($apiKey, $text) {
    $url = 'https://api.openai.com/v1/embeddings';
    $body = json_encode([
        'model' => 'text-embedding-3-small',
        'input' => mb_substr($text, 0, 7000)
    ]);
    $resp = httpPostJson($url, $body, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    $data = json_decode($resp, true);
    if (!isset($data['data'][0]['embedding'])) return null;
    return $data['data'][0]['embedding'];
}

function openaiChat($apiKey, $model, $system, $userContent) {
    $url = 'https://api.openai.com/v1/chat/completions';
    $body = json_encode([
        'model' => $model,
        'messages' => [
            [ 'role' => 'system', 'content' => $system ],
            [ 'role' => 'user', 'content' => $userContent ]
        ],
        'temperature' => 0.2,
        'max_tokens' => 600
    ]);
    $resp = httpPostJson($url, $body, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    $data = json_decode($resp, true);
    if (!isset($data['choices'][0]['message']['content'])) return '';
    return $data['choices'][0]['message']['content'];
}

function vectorToPg($arr) {
    // Format as: '[' . comma-separated floats . ']'
    if (!is_array($arr)) return '[]';
    return '[' . implode(',', array_map(function($v){ return is_numeric($v) ? (string)$v : '0'; }, $arr)) . ']';
}

function httpPostJson($url, $body, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    // More robust timeouts
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('OpenAI request failed: ' . $err);
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) {
        throw new Exception('OpenAI returned HTTP ' . $code);
    }
    return $resp;
}

function getGlobalQAPairs($question, $limit = 5) {
    $limit = max(1, min(10, (int)$limit));
    $db = getDbConnection();
    $q = mb_strtolower((string)$question, 'UTF-8');
    $q = preg_replace('/[^a-z0-9\s]+/u', ' ', $q);
    $tokens = preg_split('/\s+/', $q, -1, PREG_SPLIT_NO_EMPTY);
    $keywords = [];
    foreach ($tokens as $t) {
        if (mb_strlen($t, 'UTF-8') >= 4) {
            $keywords[] = $t;
        }
    }
    $keywords = array_slice(array_values(array_unique($keywords)), 0, 3);
    $params = [];
    $whereExtra = '';
    if (!empty($keywords)) {
        $likeParts = [];
        foreach ($keywords as $i => $kw) {
            $param = ':kw' . $i;
            $likeParts[] = 'LOWER(message) LIKE ' . $param;
            $params[$param] = '%' . $kw . '%';
        }
        $whereExtra = ' AND (' . implode(' OR ', $likeParts) . ')';
    }
    $maxCandidates = max($limit * 3, 10);
    $sql = "SELECT session_id, message, occurred_at, created_at FROM chat_messages WHERE sender = 'user'" . $whereExtra . " ORDER BY created_at DESC LIMIT " . (int)$maxCandidates;
    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, PDO::PARAM_STR);
    }
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) return [];
    $pairs = [];
    foreach ($rows as $row) {
        if (count($pairs) >= $limit) break;
        $sid = $row['session_id'];
        $t = $row['occurred_at'] ?: $row['created_at'];
        $userMessage = trim((string)$row['message']);
        if ($userMessage === '') continue;
        $stmt2 = $db->prepare("SELECT message FROM chat_messages WHERE session_id = :sid AND sender = 'bot' AND COALESCE(occurred_at, created_at) > :t ORDER BY COALESCE(occurred_at, created_at) ASC LIMIT 1");
        $stmt2->execute([':sid' => $sid, ':t' => $t]);
        $ans = $stmt2->fetchColumn();
        if (!$ans) continue;
        $qText = mb_substr(strip_tags($userMessage), 0, 220, 'UTF-8');
        $aText = mb_substr(strip_tags($ans), 0, 320, 'UTF-8');
        if ($qText === '' || $aText === '') continue;
        $pairs[] = ['q' => $qText, 'a' => $aText];
    }
    return $pairs;
}

// Learn from previous sessions to personalize answers
function getLearnedPreferences($email) {
    $prefs = [];
    $email = trim(strtolower((string)$email));
    if ($email === '') return $prefs;
    try {
        $db = getDbConnection();
        // MySQL-compatible ordering: most recently updated/created first
        $stmt = $db->prepare("SELECT preferences FROM chat_sessions WHERE visitor_email = :email AND preferences IS NOT NULL ORDER BY updated_at DESC, created_at DESC LIMIT 10");
        $stmt->execute([':email' => $email]);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $p = json_decode($row['preferences'] ?? '{}', true);
            if (is_array($p) && !empty($p)) {
                $prefs = mergePreferences($prefs, $p);
            }
        }
    } catch (Exception $e) {
        logEvent('warning', 'getLearnedPreferences failed', [ 'error' => $e->getMessage(), 'email' => $email ]);
    }
    return $prefs;
}

function mergePreferences($base, $add) {
    if (!is_array($base)) $base = [];
    if (!is_array($add)) return $base;
    foreach ($add as $k => $v) {
        if (!array_key_exists($k, $base) || $base[$k] === null || $base[$k] === '' || (is_array($base[$k]) && count($base[$k]) === 0)) {
            $base[$k] = $v;
            continue;
        }
        if (is_array($base[$k]) && is_array($v)) {
            // merge arrays uniquely
            $base[$k] = array_values(array_unique(array_merge($base[$k], $v), SORT_REGULAR));
        }
        // For scalars, keep current session's explicit preference
    }
    return $base;
}
