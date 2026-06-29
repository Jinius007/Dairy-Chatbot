import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import {
  clearGoogleUser,
  getGoogleClientId,
  isGoogleAuthConfigured,
  loadGoogleUser,
  parseGoogleJwt,
  saveGoogleUser,
  type GoogleUser,
} from "@/lib/google-auth";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  onUserChange: (user: GoogleUser | null) => void;
}

function VetGoogleSignInInner({ onUserChange }: Props) {
  const [user, setUser] = useState<GoogleUser | null>(() => loadGoogleUser());

  useEffect(() => {
    onUserChange(user);
  }, [user, onUserChange]);

  const signOut = () => {
    clearGoogleUser();
    setUser(null);
    toast.message("Signed out");
  };

  if (user) {
    return (
      <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
        {user.picture ? (
          <img src={user.picture} alt="" className="w-10 h-10 rounded-full shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-medium">Sign in with Gmail to register</p>
      <p className="text-xs text-muted-foreground">
        Use your Google account so farmers can trust your verified email on the directory.
      </p>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(res) => {
            if (!res.credential) {
              toast.error("Google sign-in failed");
              return;
            }
            const parsed = parseGoogleJwt(res.credential);
            if (!parsed) {
              toast.error("Could not read Google profile");
              return;
            }
            saveGoogleUser(parsed);
            setUser(parsed);
            toast.success(`Signed in as ${parsed.email}`);
          }}
          onError={() => toast.error("Google sign-in cancelled or failed")}
          useOneTap={false}
          theme="outline"
          size="large"
          text="signin_with"
          shape="rectangular"
        />
      </div>
    </div>
  );
}

export function VetGoogleSignIn(props: Props) {
  if (!isGoogleAuthConfigured()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Gmail sign-in is not configured yet. Set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in your env file, or enter email manually below.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={getGoogleClientId()}>
      <VetGoogleSignInInner {...props} />
    </GoogleOAuthProvider>
  );
}
