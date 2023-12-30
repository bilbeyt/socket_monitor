FROM node:18.19-slim as builder
SHELL [ "/bin/bash", "-c" ]
ENV SHELL=/bin/bash
COPY . /project
WORKDIR /project
RUN touch app.conf
RUN yarn install && yarn run build && yarn run create-executable:linux && chmod +x monitor-node18-linux-x64

FROM node:18.19-slim
SHELL [ "/bin/bash", "-c" ]
WORKDIR /project
COPY --from=builder /project/monitor-node18-linux-x64 /project/monitor-node18-linux-x64
CMD ["/project/monitor-node18-linux-x64", "monitor", "--config-file", "/project/app.conf"]

