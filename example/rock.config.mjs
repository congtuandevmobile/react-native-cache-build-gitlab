import {providerGitLab} from "react-native-cache-build-gitlab";
import {platformAndroid} from "@rock-js/platform-android";
import {platformIOS} from "@rock-js/platform-ios";
import {pluginMetro} from "@rock-js/plugin-metro";

export default {
    bundler: pluginMetro(),
    platforms: {
        ios: platformIOS(),
        android: platformAndroid(),
    },
    remoteCacheProvider: providerGitLab({
        packageName: "mobile-artifacts",
        registryServer: "https://your-gitlab-instance.com",
        projectId: 1234,
    }),
    fingerprint: {
        ignorePaths: [
            "ios/Podfile.lock",
            "ios/**/xcuserdata",
            "ios/**/project.pbxproj",
            // Add more paths to ignore as needed
        ],
    },
};
