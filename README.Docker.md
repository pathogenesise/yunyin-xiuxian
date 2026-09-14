# 云隐修仙录 Docker 部署指南

## 快速开始

### 方式一：使用预构建镜像（推荐）

每次推送到 `main` 或打 `v*.*.*` 标签，GitHub Actions 都会构建并推送多架构镜像（`linux/amd64` + `linux/arm64`）：

```bash
# 最新版本
docker run -d -p 8080:80 ghcr.io/setube/yunyin-xiuxian:latest

# 指定版本号（取 package.json 的 version，将下面的 <version> 换成实际版本号）
docker run -d -p 8080:80 ghcr.io/setube/yunyin-xiuxian:<version>

# 指定提交
docker run -d -p 8080:80 ghcr.io/setube/yunyin-xiuxian:<commit-sha>
```

若仓库配置了 `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`，同一份镜像会额外推送到 Docker Hub 的 `<user>/yunyin-xiuxian`，标签一致。

### 方式二：本地构建镜像

```bash
# 构建镜像(标签 latest)
docker build -t yunyin-xiuxian:latest .

# 构建时指定版本号
docker build -t yunyin-xiuxian:<version> .
```

### 方式三：docker compose

`docker-compose.yml` 已配好端口、时区、资源限制与日志滚动，适合自托管：

```bash
# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart
```

Compose v1 的旧 CLI 把命令换成 `docker-compose` 即可（`docker-compose.yml` 用的是 Compose v2 格式，没有 `version:` 字段）。

启动后浏览器打开 <http://localhost:8080> 即可开始游戏。

## 镜像架构

- **构建阶段**：`oven/bun:1-alpine`，`bun install --frozen-lockfile` 后跑 `bun run build`
- **生产阶段**：`nginx:alpine` + `dist/`（约 4MB 静态产物）+ `nginx.conf`，多阶段构建让最终镜像只比基础 nginx 多这一份产物
- **CI 镜像**：`Dockerfile.ci` 不在容器内构建 —— 前端由 runner 上的 Bun 构建好，镜像只负责把 `dist/` 与 `nginx.conf` 拷进去，多架构构建因此不必在 QEMU 里重跑 `vue-tsc` 与 `vite`（配合 `.dockerignore.ci` 使用：工作流会先把它覆盖到 `.dockerignore`）
- **时区**：Asia/Shanghai
- **端口**：80（容器内）→ 8080（宿主机）
- **健康检查**：内置 `HEALTHCHECK`，每 30 秒 `wget` 探测一次首页

## 生产部署建议

### 1. 构建配置

镜像构建本身无需改任何配置：`vite.config.ts` 把 `base` 固定为 `'./'`，资源按相对路径解析，音频走 `import.meta.env.BASE_URL`，所以部署到 `/` 或 `/xiuxian/` 这类子路径都能直接工作。

`.env.production` 里的 `VITE_APP_TITLE` / `VITE_BASE_URL` / `VITE_ENABLE_PWA` 目前只是占位（没有代码消费，页面标题写在 `index.html`），改了不生效，别把它们当成部署开关。

### 2. Nginx 配置

`nginx.conf` 已包含：

- Gzip 压缩（超过 1KB 的文本资源才压，压缩率约 70%）
- 静态资源缓存（JS/CSS/图片/字体等缓存 1 年，`index.html` 走 `no-cache`）
- 安全头（XSS / 点击劫持 / MIME 嗅探防护 + Referrer-Policy）
- Vue Router 兜底（`try_files ... /index.html`，刷新不 404）
- 隐藏文件拒绝访问

### 3. 资源限制

`docker-compose.yml` 已设置：

- CPU 限制：最多 1 核，预留 0.25 核
- 内存限制：最多 512MB，预留 128MB
- 日志滚动：单文件 10MB，保留 3 个

## 反向代理与 HTTPS

使用 Traefik / Nginx Proxy Manager / Caddy 时：

```yaml
# docker-compose.yml 增加 labels
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.yunyin.rule=Host(`xiuxian.example.com`)"
  - "traefik.http.routers.yunyin.tls=true"
```

HTTPS 两种做法：

- **方案 A（推荐）**：在反向代理层终止 SSL，容器继续保持 `:80` 明文
- **方案 B**：容器内启用 HTTPS，挂载证书到 `/etc/nginx/ssl/` 并改 `nginx.conf`

注意游戏用 hash 路由（`base: './'`），反向代理一般无需特殊重写规则；把站点根路径指到容器 `:80` 即可。

## 健康检查

容器内置健康检查，每 30 秒探测一次：

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' yunyin-xiuxian

# 手动探测
docker exec yunyin-xiuxian wget -qO- http://localhost/
```

## 存档数据说明

**重要**：游戏存档存储在客户端浏览器 localStorage，不在容器内。

- 存档位置：浏览器本地存储（`yunyin.` 前缀的键）
- 容器重建：不影响已有存档
- 迁移方法：游戏内导出 `.save` 文件，新环境导入

## 故障排查

### 容器启动失败

```bash
# 查看日志
docker logs yunyin-xiuxian

# 进入容器检查
docker exec -it yunyin-xiuxian sh
ls -lh /usr/share/nginx/html/
```

### 端口冲突

```bash
# 修改映射端口
docker run -p 3000:80 yunyin-xiuxian:latest

# 或修改 docker-compose.yml
ports:
  - "3000:80"
```

### 资源不足

```bash
# 检查容器资源使用
docker stats yunyin-xiuxian

# 调整限制(docker-compose.yml)
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
```

### 页面白屏或资源 404

先看 `docker logs yunyin-xiuxian` 与浏览器 Network 面板。`base: './'` 下资源走相对路径，子路径部署一般不会因此 404；若确实拉不到资源，多半是反向代理改写了 URL 前缀或没把整站交给容器。

## 开发与生产分离

开发环境（热重载）：

```bash
bun run dev
```

生产构建测试：

```bash
# 本地构建
bun run build
bun preview

# Docker 构建
docker build -t yunyin-xiuxian:dev .
docker run -p 8080:80 yunyin-xiuxian:dev
```

## 清理资源

```bash
# 停止并删除容器
docker compose down

# 删除镜像
docker rmi yunyin-xiuxian:latest

# 清理未使用的镜像和缓存
docker system prune -a
```

## CI/CD

### 仓库内置工作流

`.github/workflows/yunyin.yml` 在 push 到 `main`、打 `v*.*.*` 标签或手动触发时执行：`bun run check` + `bun run test` 全绿 → `bun run build` → 校验 `dist/index.html` → 用 `Dockerfile.ci` 构建 `linux/amd64,linux/arm64` 多架构镜像 → 推送 GHCR（`latest` / 版本号 / commit sha 三个标签）；配置了 Docker Hub 凭据时同样推送一份。

### 自建镜像发布示例

```yaml
name: Build Docker Image

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run check && bun run test
      - run: bun run build
      - run: cp .dockerignore.ci .dockerignore
      - uses: docker/setup-qemu-action@v4
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v7
        with:
          context: .
          file: ./Dockerfile.ci
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/yunyin-xiuxian:latest
            ghcr.io/${{ github.repository_owner }}/yunyin-xiuxian:${{ github.ref_name }}
```

## 许可证

本项目采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans) 许可协议。

允许自由共享和演绎，但 **未经作者书面授权，禁止用于任何商业目的**。详见 [LICENSE](LICENSE) 文件。
