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
        baseUrl: "https://your-gitlab-instance.com",
        projectId: 1234,
        token: process.env.CI_JOB_TOKEN,
        tokenHeader: process.env.CI ? "JOB-TOKEN" : "PRIVATE-TOKEN",
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
