var { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
var { z } = require('zod');
var fs = require('fs');
var path = require('path');

// Sandbox directory used by the file tools below - reads are only ever
// resolved inside this folder, never against an arbitrary client-supplied path.
var SAMPLE_FILES_DIR = path.join(__dirname, 'sample-files');

// Creates a fresh McpServer instance with all tools/resources/prompts registered.
// A new instance is created per client session (see routes/mcp.js).
function createMcpServer() {
  var server = new McpServer({
    name: 'mcp-server',
    version: '1.0.0'
  });

  server.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Health-check tool that echoes back a message.',
      inputSchema: {
        message: z.string().optional().describe('Optional message to echo back')
      }
    },
    async function ({ message }) {
      return {
        content: [
          {
            type: 'text',
            text: 'pong' + (message ? ': ' + message : '')
          }
        ]
      };
    }
  );

  server.registerTool(
    'text-stats',
    {
      title: 'Text Stats',
      description: 'Analyzes a block of text and returns word, character, sentence and line counts.',
      inputSchema: {
        text: z.string().describe('The text to analyze')
      }
    },
    async function ({ text }) {
      var words = text.trim().length ? text.trim().split(/\s+/) : [];
      var sentences = text.trim().length ? text.trim().split(/[.!?]+/).filter(function (s) { return s.trim().length; }) : [];
      var lines = text.length ? text.split(/\r\n|\r|\n/) : [];

      var stats = {
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: words.length,
        sentences: sentences.length,
        lines: lines.length,
        readingTimeSeconds: Math.ceil(words.length / 200 * 60) // ~200 wpm
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    'generate-avatar',
    {
      title: 'Generate Avatar',
      description: 'Generates a deterministic identicon-style SVG avatar image from a seed string.',
      inputSchema: {
        seed: z.string().describe('Seed string used to deterministically generate the avatar (e.g. a username)'),
        size: z.number().int().min(64).max(512).optional().describe('Image size in pixels (default 256)')
      }
    },
    async function ({ seed, size }) {
      var svg = generateIdenticonSvg(seed, size || 256);
      var base64 = Buffer.from(svg, 'utf8').toString('base64');

      return {
        content: [
          {
            type: 'image',
            data: base64,
            mimeType: 'image/svg+xml'
          }
        ]
      };
    }
  );

  server.registerTool(
    'list-files',
    {
      title: 'List Sample Files',
      description: 'Lists the files available in the server\'s sandboxed sample-files directory.',
      inputSchema: {}
    },
    async function () {
      var entries = fs.readdirSync(SAMPLE_FILES_DIR, { withFileTypes: true })
        .filter(function (entry) { return entry.isFile(); })
        .map(function (entry) {
          var stat = fs.statSync(path.join(SAMPLE_FILES_DIR, entry.name));
          return entry.name + ' (' + stat.size + ' bytes)';
        });

      return {
        content: [
          {
            type: 'text',
            text: entries.length ? entries.join('\n') : 'No sample files found.'
          }
        ]
      };
    }
  );

  server.registerTool(
    'read-file',
    {
      title: 'Read Sample File',
      description: 'Reads the contents of a file from the server\'s sandboxed sample-files directory.',
      inputSchema: {
        filename: z.string().describe('Name of the file to read, as returned by the list-files tool')
      }
    },
    async function ({ filename }) {
      var resolved = path.resolve(SAMPLE_FILES_DIR, filename);

      // Guard against path traversal - the resolved path must stay inside the sandbox.
      if (path.dirname(resolved) !== SAMPLE_FILES_DIR || !fs.existsSync(resolved)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'File not found: ' + filename
            }
          ]
        };
      }

      var contents = fs.readFileSync(resolved, 'utf8');

      return {
        content: [
          {
            type: 'text',
            text: contents
          }
        ]
      };
    }
  );

  server.registerTool(
    'roll-dice',
    {
      title: 'Roll Dice',
      description: 'Rolls one or more N-sided dice and returns the individual results and their total.',
      inputSchema: {
        sides: z.number().int().min(2).max(1000).optional().describe('Number of sides per die (default 6)'),
        count: z.number().int().min(1).max(20).optional().describe('Number of dice to roll (default 1)')
      }
    },
    async function ({ sides, count }) {
      var numSides = sides || 6;
      var numDice = count || 1;
      var rolls = [];
      for (var i = 0; i < numDice; i++) {
        rolls.push(Math.floor(Math.random() * numSides) + 1);
      }
      var total = rolls.reduce(function (sum, roll) { return sum + roll; }, 0);

      return {
        content: [
          {
            type: 'text',
            text: 'Rolls: ' + rolls.join(', ') + ' | Total: ' + total
          }
        ]
      };
    }
  );

  return server;
}

// Builds a simple 5x5 mirrored identicon (à la GitHub) as an SVG string,
// deterministically derived from the seed via a small string hash.
function generateIdenticonSvg(seed, size) {
  var hash = 0;
  for (var i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  var hue = Math.abs(hash) % 360;
  var color = 'hsl(' + hue + ', 65%, 55%)';

  var gridSize = 5;
  var cell = size / gridSize;
  var cells = [];

  // Only compute the left half + center column, then mirror to the right half.
  var half = Math.ceil(gridSize / 2);
  for (var row = 0; row < gridSize; row++) {
    for (var col = 0; col < half; col++) {
      var bit = (hash >> (row * half + col)) & 1;
      if (bit) {
        cells.push({ row: row, col: col });
        var mirroredCol = gridSize - 1 - col;
        if (mirroredCol !== col) {
          cells.push({ row: row, col: mirroredCol });
        }
      }
    }
  }

  var rects = cells.map(function (c) {
    return '<rect x="' + (c.col * cell) + '" y="' + (c.row * cell) + '" width="' + cell + '" height="' + cell + '" fill="' + color + '" />';
  }).join('');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<rect width="' + size + '" height="' + size + '" fill="#f0f0f0" />' +
    rects +
    '</svg>';
}

module.exports = { createMcpServer: createMcpServer };
