// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "CartoonXTV",
    platforms: [.tvOS(.v15)],
    products: [
        .executable(name: "CartoonXTV", targets: ["CartoonXTV"])
    ],
    targets: [
        .executableTarget(
            name: "CartoonXTV",
            path: "CartoonXTV"
        )
    ]
)

