# Socket Monitor

This project is aiming to track [Socket protocol](https://socket.tech/) and report and act against mismatches than can happen.

## Local Development

### Requirements

1. NodeJS
2. Yarn

### Setup

Clone project and install dependencies.

```
# clone the repository
git clone https://github.com/bilbeyt/socket_monitor

# move to repository folder
cd socket_monitor

# install node modules
yarn install
```

### Lint

You can trigger linter by using below command.

`yarn lint`

### Test

You can run unit tests by running:

`yarn test:unit`

You can run tests with coverage by running:

`yarn test:coverage`

## Run monitoring

### Prerequisites

1. Create a config file using the template app.conf.template. Check [reference](src/README.md) for more information.
2. Run below command to gather deployment artifacts of Socket.tech:

   `curl -sSfL https://registry.npmjs.org/@socket.tech/dl-core/-/dl-core-2.4.15.tgz | tar xz -C data --strip-components=1 package/artifacts package/dist/deployments`
3. Create a keystore file for your account that has funds on it and put it inside data directory created by previous command.

### Running Locally

`yarn monitor ${config-file-you-created}`.

### Running Docker

This step requires [Docker](https://docs.docker.com/engine/install/).

1. Build the image using below command.

   `docker build -t socket-monitor`
2. Run the image:

   `docker run -v ${pwd}/data:/project/data -v ${pwd}/{config-file-you-created}:/project/app.conf socket-monitor`
