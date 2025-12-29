# @congtuandevmobile/react-native-cache-build-gitlab

GitLab Generic Package provider for [RockJS](https://rockjs.dev) with single package support.

## Features

✅ **Single Package Storage**: All native builds (iOS & Android) stored in one package  
✅ **Fingerprint-based Lookup**: Fast artifact retrieval by filename matching  
✅ **CI/CD Ready**: Works seamlessly with GitLab CI  
✅ **Cost Effective**: Reduces package registry clutter

## Installation

```bash
npm install react-native-cache-build-gitlab
# or
yarn add react-native-cache-build-gitlab
```

## Usage

In your `rock.config.mjs`:

```javascript
import { platformIOS } from "@rock-js/platform-ios";
import { platformAndroid } from "@rock-js/platform-android";
import { providerGitLab } from "react-native-cache-build-gitlab";
import { pluginMetro } from "@rock-js/plugin-metro";

export default {
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS(),
    android: platformAndroid(),
  },
  remoteCacheProvider: providerGitLab({
    packageName: "mobile-artifacts",
    baseUrl: "https://gitlab.example.com",
    projectId: 1234,
    token: process.env.CI_JOB_TOKEN,
    tokenHeader: process.env.CI ? "JOB-TOKEN" : "PRIVATE-TOKEN",
  }),
};
```

## Configuration

| Option        | Type                             | Description                                     |
| ------------- | -------------------------------- | ----------------------------------------------- |
| `packageName` | `string`                         | Package name in GitLab Generic Package Registry |
| `baseUrl`     | `string`                         | GitLab instance URL                             |
| `projectId`   | `number`                         | GitLab project ID                               |
| `token`       | `string`                         | GitLab access token (`CI_JOB_TOKEN` on CI)      |
| `tokenHeader` | `"JOB-TOKEN" \| "PRIVATE-TOKEN"` | Token type                                      |

## How It Works

### Upload (CI)

All builds are uploaded to a **single package** with version `1.0.0`:

```
mobile-artifacts@1.0.0/
  ├── rock-ios-simulator-Debug-{fingerprint}.zip
  ├── rock-android-devDebug-{fingerprint}.zip
  └── ...
```

### Download (Local/CI)

When running:

1. Calculate project fingerprint
2. Search for file containing the fingerprint
3. Download and extract

## GitLab CI Example

```yaml
build_android_cache:
  stage: build
  script:
    - bun run build:android --variant=devDebug
    - CACHE_DIR="$(ls -1dt .rock/cache/remote-build/rock-android-* | head -n1)"
    - sh scripts/upload-cache-remote.sh "${CACHE_DIR}" rock-android-devDebug-{FP}.zip android
```

## Differences from Official Provider

The official `@rock-js/provider-gitlab` creates **one package per fingerprint**, which can clutter the package registry.

This provider stores **all builds in one package** (version `1.0.2`), using filename-based lookup instead of version-based lookup.

## License

MIT

## Author

Nguyễn Công Tuấn <nguyencongtuan.devmobile@gmail.com>
