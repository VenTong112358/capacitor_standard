import UIKit
import Capacitor
import AuthenticationServices

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ASWebAuthPlugin())
    }
}

@objc(ASWebAuth)
class ASWebAuthPlugin: CAPPlugin, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Invalid URL")
            return
        }

        DispatchQueue.main.async {
            // Keep in sync with capacitor.config.ts appId and App URL Types.
            self.authSession = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "com.capacitor.standard"
            ) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    call.reject("cancelled")
                    return
                }
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                guard let callbackURL = callbackURL else {
                    call.reject("No callback URL received")
                    return
                }
                call.resolve(["url": callbackURL.absoluteString])
            }
            self.authSession?.presentationContextProvider = self
            self.authSession?.prefersEphemeralWebBrowserSession = false
            self.authSession?.start()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge!.viewController!.view.window!
    }
}
