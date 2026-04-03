import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      description="Join as a customer or register your studio to list products and classes."
    >
      <RegisterForm />
    </AuthShell>
  );
}
