import SafariServices

/// Ponte nativa da Safari Web Extension. O Instagram Minimal não precisa de
/// mensagens nativas: toda a lógica roda em JavaScript dentro do Safari e as
/// configurações ficam no armazenamento da própria extensão. Este handler
/// só responde, caso o Safari o chame.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: ["ok": true]]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
