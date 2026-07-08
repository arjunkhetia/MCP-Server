var express = require('express');
var router = express.Router();
var { randomUUID } = require('crypto');
var { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
var { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
var { createMcpServer } = require('../mcp/server');

// Map of MCP session id -> transport, kept in memory for the life of this process.
var transports = {};

/* POST - handles MCP client-to-server requests, including session initialization. */
router.post('/', async function (req, res) {
  var sessionId = req.headers['mcp-session-id'];
  var transport;

  if (sessionId && transports[sessionId]) {
    // Reuse the transport for an existing session.
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session - spin up a dedicated server + transport pair.
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: function () {
        return randomUUID();
      },
      onsessioninitialized: function (newSessionId) {
        transports[newSessionId] = transport;
      }
    });

    transport.onclose = function () {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    var server = createMcpServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided'
      },
      id: null
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

/* GET/DELETE - handle the server-to-client notification stream and session teardown. */
var handleSessionRequest = async function (req, res) {
  var sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  var transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

router.get('/', handleSessionRequest);
router.delete('/', handleSessionRequest);

module.exports = router;
