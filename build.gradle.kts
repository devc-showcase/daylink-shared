// com.daylink:api-spec — OpenAPI 명세를 담은 Maven 아티팩트.
//
// 왜 자바 코드를 생성하지 않고 명세만 담나:
//   서버 측 생성 코드는 Spring 버전과 생성기 설정에 묶인다. 그 설정은
//   daylink-core-api가 자기 빌드에서 정하는 편이 맞다. 여기서 생성해 배포하면
//   Core API의 Spring을 올릴 때마다 이 저장소를 먼저 배포해야 한다.
//   명세만 주면 소비자가 자기 시점에 생성한다(ADR-0015).
//
// npm 쪽은 반대다. 프론트 4벌이 같은 타입을 봐야 동등성 비교가 성립하므로
// 생성물을 배포한다(00 §9).

plugins {
    base
    `maven-publish`
}

group = "com.daylink"
version = providers.gradleProperty("sharedVersion").get()

// 명세 파일만 담은 jar. 소비자는 jar 안의 openapi.yaml을 읽어 생성기를 돌린다.
val specJar by tasks.registering(Jar::class) {
    archiveBaseName.set("api-spec")
    destinationDirectory.set(layout.buildDirectory.dir("libs"))
    from("api-spec") {
        include("openapi.yaml")
        include("errors.md")
        into("daylink")
    }
}

publishing {
    publications {
        create<MavenPublication>("apiSpec") {
            artifactId = "api-spec"
            artifact(specJar)
            pom {
                name.set("DayLink API Spec")
                description.set("DayLink Core API OpenAPI 명세. 네 프론트 구현과 Core API가 공유하는 단일 명세다.")
                url.set("https://github.com/devc-showcase/daylink-shared")
            }
        }
    }
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/devc-showcase/daylink-shared")
            credentials {
                // CI에서는 GITHUB_ACTOR·GITHUB_TOKEN이 자동으로 들어온다.
                // 로컬에서는 ~/.gradle/gradle.properties에 gpr.user·gpr.key를 둔다.
                username = System.getenv("GITHUB_ACTOR") ?: providers.gradleProperty("gpr.user").orNull
                password = System.getenv("GITHUB_TOKEN") ?: providers.gradleProperty("gpr.key").orNull
            }
        }
    }
}
