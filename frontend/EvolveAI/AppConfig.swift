enum AppEnvironment {
    static let networkService: NetworkServiceProtocol = {
        #if DEBUG
        return MockNetworkService()
        #else
        return NetworkService()
        #endif
    }()
}
