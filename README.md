# MCP Server   ![Version][version-image]

![Linux Build][linuxbuild-image]
![Windows Build][windowsbuild-image]
![NSP Status][nspstatus-image]
![Test Coverage][coverage-image]
![Dependency Status][dependency-image]
![devDependencies Status][devdependency-image]

The quickest way to get start with MCP Server with Node.Js & Express, just clone the project:

```bash
$ git clone https://github.com/arjunkhetia/MCP-Server.git
```

Install dependencies:

```bash
$ npm install
```

Start Express.js app at `http://localhost:3000/`:

```bash
$ npm start
```

# Nodemon

Nodemon will watch the files in the directory in which nodemon was started, and if any files change, nodemon will automatically restart your node application.

Start Express.js app with nodemon at `http://localhost:3000/`:

```bash
$ nodemon bin/www
```

# Node PortFinder

Node PortFinder is a tool to find an open port or domain socket on the machine.

```js
var portfinder = require('portfinder');
var port = 3000;
var portSpan = 999;
portfinder.getPort({
  port: port,    // minimum port number
  stopPort: port + portSpan // maximum port number
}, function (err, openPort) {
  if (err) throw err;
  port = openPort;
});
```

# Nodejs Cluster

Node.js runs in a single process, by default. Ideally, we want one process for each CPU core, so we can distribute the workload across all the cores. Hence improving the scalability of web apps handling HTTP requests and performance in general. In addition to this, if one worker crashes, the others are still available to handle requests.

```js
var cluster = require('cluster');
var workers = process.env.WORKERS || require('os').cpus().length;

if (cluster.ismain) {
  console.log('main cluster is running on %s with %s workers', process.pid, workers);
  for (var i = 0; i < workers; ++i) {
    var worker = cluster.fork().process;
    console.log('worker %s on %s started', i+1, worker.pid);
  }
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker %s died. restarting...', worker.process.pid);
    cluster.fork();
  });
}

if (cluster.isWorker) {
  // Server code
}
```

# Logger - Morgan & Winston

Morgan - HTTP request logger middleware for node.js:

```js
var logger = require('morgan');
app.use(logger('dev'));
app.use(logger(':remote-addr :remote-user :datetime :req[header] :method :url HTTP/:http-version :status :res[content-length] :res[header] :response-time[digits] :referrer :user-agent', {
    stream: accessLogStream
}));
```

Winston - is designed to be a simple and universal logging library with support for multiple transports:

```js
var winston = require('winston');
var logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize({
        all: true
    }),
    winston.format.printf(
        data => `${data.level} : ${data.message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      level: 'silly'
    }),
    new winston.transports.File({
      level: 'silly',
      filename: './log/ServerData.log'
    })
  ]
});
```

# Rotating File Stream

To provide an automated rotation of Express/Connect logs or anything else that writes to a log on a regular basis that needs to be rotated based on date.

```js
var rfs    = require('rotating-file-stream');
var accessLogStream = rfs('file.log', {
    size:     '10M', // rotate every 10 MegaBytes written
    interval: '1d', // rotate daily
    compress: 'gzip' // compress rotated files
    path: 'log' // folder path for log files
});
```

# Server Status Monitor

Express Status Monitor is simple, self-hosted module based on Socket.io and Chart.js to report realtime server metrics for Express-based ode servers.

```js
app.use(require('express-status-monitor')({
  title: 'Server Status', // title for status screen
  path: '/status', // path for server status invokation
  spans: [{
    interval: 1, // every second
    retention: 60 // keep 60 datapoints in memory
  }, {
    interval: 5, // every 5 seconds
    retention: 60
  }],
  chartVisibility: {
    cpu: true, // enable CPU Usage
    mem: true, // enable Memory Usage
    load: true, // enable One Minute Load Avg
    eventLoop: true, // enable EventLoop Precess Usage
    heap: true, // enable Heap Memory Usage
    responseTime: true, // enable Response Time
    rps: true, // enable Requests per Second
    statusCodes: true // enable Status Codes
  },
  healthChecks: [{
    protocol: 'http', // protocol
    host: 'localhost' // server host name
    path: '/users', // endpoint to check status
    port: '3000' // server port
  }], // health check will be considered successful if the endpoint returns a 200 status code
  ignoreStartsWith: '/admin' // ignore path starts with
}));
```

![Monitoring Page](https://github.com/arjunkhetia/MCP-Server/blob/main/public/status-monitor.png "Monitoring Page")

# MCP (Model Context Protocol) Server

MCP SDK is used to expose an MCP server over the Streamable HTTP transport, served at the `/mcp` endpoint. A handful of demo tools ([mcp/server.js](mcp/server.js)) showcase the different content types a tool can return:

| Tool | Category | Description |
| --- | --- | --- |
| `ping` | health check | Echoes back an optional message. |
| `text-stats` | text | Analyzes a block of text - word/char/sentence/line counts and estimated reading time. |
| `generate-avatar` | image | Deterministically generates an identicon-style SVG avatar from a seed string, returned as base64 image content. |
| `list-files` | file | Lists the files available in the server's sandboxed `mcp/sample-files/` directory. |
| `read-file` | file | Reads a file's contents from the sandboxed directory (path-traversal safe). |
| `roll-dice` | utility | Rolls N dice with configurable sides and returns the individual results and total. |

```js
var { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
var server = new McpServer({
  name: 'mcp-server', // server name reported to clients
  version: '1.0.0' // server version reported to clients
});

server.registerTool(
  'ping', // tool name
  {
    title: 'Ping', // human readable title
    description: 'Health-check tool that echoes back a message.', // tool description
    inputSchema: {
      message: z.string().optional().describe('Optional message to echo back') // tool arguments schema
    }
  },
  async function ({ message }) {
    return { content: [{ type: 'text', text: 'pong' + (message ? ': ' + message : '') }] }; // tool response
  }
);
```

# Postman (Client) -

### Connect Postman to MCP Server
![1](https://github.com/arjunkhetia/MCP-Server/blob/main/public/1.png "1")

### Tool 1 (ping)
![2](https://github.com/arjunkhetia/MCP-Server/blob/main/public/2.png "2")

### Tool 2 (text-stats)
![3](https://github.com/arjunkhetia/MCP-Server/blob/main/public/3.png "3")

### Tool 3 (generate-avatar)
![4](https://github.com/arjunkhetia/MCP-Server/blob/main/public/4.png "4")

### Tool 4 (list-files)
![5](https://github.com/arjunkhetia/MCP-Server/blob/main/public/5.png "5")

### Tool 5 (read-file)
![6](https://github.com/arjunkhetia/MCP-Server/blob/main/public/6.png "6")

### Tool 6 (roll-dice)
![7](https://github.com/arjunkhetia/MCP-Server/blob/main/public/7.png "7")

# Claude Code (Client) -

### Connect Claude Code to MCP Server
![C1](https://github.com/arjunkhetia/MCP-Server/blob/main/public/C1.png "C1")

### Select MCP Server
![C2](https://github.com/arjunkhetia/MCP-Server/blob/main/public/C2.png "C2")

### MCP Server Tools List
![C3](https://github.com/arjunkhetia/MCP-Server/blob/main/public/C3.png "C3")

### Prompt Claude To Get Data From MCP Server
![C4](https://github.com/arjunkhetia/MCP-Server/blob/main/public/C4.png "C4")

### Prompt Claude To Process Data Of MCP Server
![C5](https://github.com/arjunkhetia/MCP-Server/blob/main/public/C5.png "C5")

[version-image]: https://img.shields.io/badge/Version-1.0.0-orange.svg
[linuxbuild-image]: https://img.shields.io/badge/Linux-passing-brightgreen.svg
[windowsbuild-image]: https://img.shields.io/badge/Windows-passing-brightgreen.svg
[nspstatus-image]: https://img.shields.io/badge/nsp-no_known_vulns-blue.svg
[coverage-image]: https://img.shields.io/coveralls/expressjs/express/main.svg
[dependency-image]: https://img.shields.io/badge/dependencies-up_to_date-brightgreen.svg
[devdependency-image]: https://img.shields.io/badge/devdependencies-up_to_date-yellow.svg
