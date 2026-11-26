import SwiftUI
#if os(macOS)
import SafariServices
#endif

/// App contêiner da extensão. O app NÃO acessa o Instagram, não tem login e
/// não guarda dados: ele apresenta o projeto e ensina a ativar a extensão.
/// Modo e bloqueios são escolhidos no painel da própria extensão, dentro do
/// Safari (ícone de extensões na barra de endereço), que é a fonte única
/// das configurações.
struct RootView: View {
    @AppStorage("im.onboarded") private var onboarded = false

    var body: some View {
        Group {
            if onboarded {
                HomeView()
            } else {
                WelcomeView { withAnimation(.easeOut(duration: 0.2)) { onboarded = true } }
            }
        }
        #if os(macOS)
        .frame(width: 440, height: 640)
        #endif
    }
}

struct WelcomeView: View {
    var onStart: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            LogoMark(size: 72).padding(.bottom, 32)
            Text("Seu Instagram. Do seu jeito.")
                .font(.system(size: 32, weight: .bold))
                .tracking(-0.8)
                .multilineTextAlignment(.center)
            Text("Menos distrações. Mais intenção.")
                .font(.title3)
                .foregroundStyle(Theme.midGray)
                .padding(.top, 10)
            Spacer()
            Button(action: onStart) {
                Text("Configurar agora")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.capsule)
            .tint(Theme.blue)
        }
        .padding(28)
    }
}

struct HomeView: View {
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Ative a extensão no Safari").font(.headline)
                        Text("Depois, abra instagram.com no Safari e entre normalmente. O bloqueio começa sozinho.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.midGray)
                    }
                    .padding(.vertical, 4)
                }

                Section("Como ativar") {
                    #if os(iOS)
                    StepRow(n: 1, text: "Abra Ajustes > Apps > Safari > Extensões.")
                    StepRow(n: 2, text: "Toque em Instagram Minimal e ative.")
                    StepRow(n: 3, text: "Em Permissões, permita instagram.com.")
                    StepRow(n: 4, text: "No Safari, toque no ícone de extensões na barra de endereço para escolher o modo e os bloqueios.")
                    #else
                    StepRow(n: 1, text: "Clique em Abrir configurações do Safari, abaixo.")
                    StepRow(n: 2, text: "Marque Instagram Minimal na lista de extensões.")
                    StepRow(n: 3, text: "Permita o acesso a instagram.com.")
                    StepRow(n: 4, text: "Clique no ícone da extensão na barra do Safari para escolher o modo e os bloqueios.")
                    #endif
                    OpenSettingsButton()
                }

                Section("Privacidade") {
                    FactRow(text: "Nenhuma senha armazenada")
                    FactRow(text: "Nenhuma conta intermediada pelo Instagram Minimal")
                    FactRow(text: "Configurações armazenadas localmente")
                    FactRow(text: "Nenhum rastreamento publicitário ou telemetria")
                }

                Section {
                    Link("Documentação", destination: URL(string: "https://bragahauser-byte.github.io/instagram-minimal/#docs")!)
                    Link("Código-fonte no GitHub", destination: URL(string: "https://github.com/bragahauser-byte/instagram-minimal")!)
                } footer: {
                    Text("Projeto independente. Não é afiliado à Meta nem ao Instagram.")
                }
            }
            .navigationTitle("Instagram Minimal")
        }
    }
}

private struct StepRow: View {
    let n: Int
    let text: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text("\(n)")
                .font(.footnote.weight(.semibold))
                .frame(width: 22, height: 22)
                .background(Circle().fill(Theme.blue.opacity(0.12)))
                .foregroundStyle(Theme.blue)
            Text(text)
        }
    }
}

private struct FactRow: View {
    let text: String

    var body: some View {
        HStack {
            Text(text)
            Spacer()
            Image(systemName: "checkmark").foregroundStyle(.green)
        }
    }
}

private struct OpenSettingsButton: View {
    var body: some View {
        #if os(iOS)
        Button("Abrir Ajustes") {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        }
        #else
        Button("Abrir configurações do Safari") {
            SFSafariApplication.showPreferencesForExtension(
                withIdentifier: "io.github.bragahauser.instagramminimal.extension"
            ) { _ in }
        }
        #endif
    }
}

#Preview { RootView() }
