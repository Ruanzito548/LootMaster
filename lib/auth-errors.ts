export function getFriendlyAuthError(code: string, fallback: string) {
  switch (code) {
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled in Firebase. Enable it in Firebase Console > Authentication > Sign-in method > Google.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing login.";
    case "auth/popup-blocked":
      return "Popup was blocked by the browser. Allow popups and try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in popup is already open.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-disabled":
      return "This account is disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "This email is already in use.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    default:
      return fallback;
  }
}
