import SwiftUI

struct LoginView: View {
    // Get the UserManager from the environment to call its functions
    @EnvironmentObject var userManager: UserManager
    
    // State for the text fields
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ZStack {
            // 2. Dimming Overlay (same as WelcomeStep)
            Color.black.opacity(0.5).ignoresSafeArea()
            
            // 3. The rest of the content sits on top
            VStack(spacing: 20) {

                MainTitleView()
                    .padding(.top, 80)
                
                Spacer()
                
                // --- Social Login Buttons ---
                VStack(spacing: 15) {
                    SocialLoginButton(
                        imageName: "apple.logo",
                        text: "Sign In with Apple (Coming Soon)",
                        isSystemImage: true,
                        action: userManager.signInWithApple
                    )
                    .disabled(true)
                    .opacity(0.5)
                    
                    SocialLoginButton(
                        imageName: "google.logo", // Custom asset
                        text: "Sign In with Google",
                        action: userManager.signInWithGoogle
                    )
                    
                    SocialLoginButton(
                        imageName: "facebook",
                        text: "Sign In with Facebook",
                        action: userManager.signInWithFacebook
                    )
                }
                
                // --- Separator ---
                HStack {
                    Rectangle().frame(height: 1).foregroundColor(.white)
                    Text("OR")
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.white)
                    Rectangle().frame(height: 1).foregroundColor(.white)
                }
                .padding(.vertical)
                
                // --- Email & Password Fields ---
                VStack(spacing: 15) {
                    CustomTextField(placeholder: "Email", text: $email)
                        .keyboardType(.emailAddress)
                    
                    CustomSecureField(placeholder: "Password", text: $password)
                }
                
                // --- Forgot Password ---
                HStack {
                    Spacer()
                    Button("Forgot Password?") {
                        // Add forgot password logic here
                    }
                    .font(.subheadline)
                    .foregroundColor(.evolvePrimary) // Use your app's primary color
                }
                
                Spacer()
                
                // --- Login Button ---
                VStack(spacing: 20) {
                    if userManager.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)
                    } else {
                        Button("Sign In") {
                            userManager.signInWithEmail(email: email, password: password)
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                    
                    // Show error message if any
                    if let errorMessage = userManager.errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                            .multilineTextAlignment(.center)
                    }
                    
                    // --- Sign Up Link ---
                    HStack {
                        Text("Don't have an account?")
                            .foregroundColor(.gray)
                        Button("Sign Up") {
                            // Navigation logic to the sign-up screen
                        }
                        .foregroundColor(.evolvePrimary) // Use your app's primary color
                        .fontWeight(.semibold)
                    }
                }
                
            }
            .padding(.horizontal, 30)
        }.background(
            // Use an Image view for the background
            Image("background") //
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
        )
    }
}


struct SocialLoginButton: View {
    let imageName: String
    let text: String
    var isSystemImage: Bool = false // Default to custom asset
    var backgroundColor: Color = Color.white.opacity(0.15)
    var foregroundColor: Color = .white
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                // Conditionally use Image(systemName:) or Image()
                if isSystemImage {
                    Image(systemName: imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 20, height: 20)
                } else {
                    Image(imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 20, height: 20)
                }
                
                Spacer()
                
                Text(text)
                    .font(.headline)
                    .fontWeight(.medium)
                
                Spacer()
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(backgroundColor)
            .foregroundColor(foregroundColor)
            .cornerRadius(12)
        }
    }
}

struct CustomTextField: View {
    let placeholder: String
    @Binding var text: String
    
    var body: some View {
        ZStack(alignment: .leading) {
            // Custom placeholder text
            if text.isEmpty {
                Text(placeholder)
                    .foregroundColor(.white.opacity(0.7))
                    .padding(.leading, 16)
            }
            
            TextField("", text: $text)
                .padding()
                .foregroundColor(.white)
                .accentColor(.evolvePrimary) // Cursor color
                .autocapitalization(.none)
        }
        .background(Color.black.opacity(0.5))
        .cornerRadius(12)
    }
}

struct CustomSecureField: View {
    let placeholder: String
    @Binding var text: String
    
    var body: some View {
        ZStack(alignment: .leading) {
            // Custom placeholder text
            if text.isEmpty {
                Text(placeholder)
                    .foregroundColor(.white.opacity(0.7))
                    .padding(.leading, 16)
            }
            
            SecureField("", text: $text)
                .padding()
                .foregroundColor(.white)
                .accentColor(.blue) // Cursor color
        }
        .background(Color.black.opacity(0.5))
        .cornerRadius(12)
    }
}

#Preview {
    // NOTE: This preview uses SFSymbols. For the final design,
    // create custom image assets named "google.logo" and "facebook.logo"
    // and ensure you have an image named "background" in your assets.
    LoginView()
        .environmentObject(UserManager())
}
