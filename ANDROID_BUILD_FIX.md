# Android SDK 35 build configuration

The Play Billing dependency resolves AndroidX Core 1.15.0, which requires compile SDK 35. The project now uses compile SDK 35, Android Gradle Plugin 8.6.1 and Gradle 8.7. Use JDK 17. Target SDK remains 34; this fix does not certify Play submission requirements.

No Android Studio is needed. Keep your own android/local.properties and signing configuration.

1. Install Android platform 35 in the same SDK directory referenced by local.properties. In Command Prompt, if ANDROID_HOME points to that SDK:

```bat
"%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-35" "build-tools;34.0.0"
"%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
```

If ANDROID_HOME is unset or the command-line tools folder has another name, use the full path to your existing sdkmanager.bat instead. Accept the SDK licences when prompted.

2. In the android folder:

```bat
gradlew --stop
gradlew --version
gradlew assembleDebug
```

Gradle downloads 8.7 on the first run; --version should report Gradle 8.7 and JVM 17. If the SDK is absent, use the command-line SDK installation instructions in README.md. If your Java version differs, point JAVA_HOME to an existing JDK 17 installation for the terminal session.

The flatDir warnings are not the reason for the AAR metadata failure. No dependency downgrade or suppressUnsupportedCompileSdk flag is needed.

Configuration was checked against Android's AGP compatibility documentation. An APK was not compiled in the editing environment because it has no Android SDK.

https://developer.android.com/build/releases/agp-8-6-0-release-notes
