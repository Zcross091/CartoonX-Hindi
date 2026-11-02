import UIKit
import TVMLKit

class AppDelegate: UIResponder, UIApplicationDelegate, TVApplicationControllerDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        let viewController = UIViewController()
        viewController.view.backgroundColor = UIColor(red: 0.05, green: 0.09, blue: 0.16, alpha: 1.0)
        
        let label = UILabel(frame: CGRect(x: 0, y: 0, width: 800, height: 120))
        label.center = viewController.view.center
        label.textAlignment = .center
        label.textColor = .white
        label.font = UIFont.boldSystemFont(ofSize: 48)
        label.text = "CartoonX - Hindi Toons TV"
        viewController.view.addSubview(label)

        window?.rootViewController = viewController
        window?.makeKeyAndVisible()
        return true
    }
}

UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
