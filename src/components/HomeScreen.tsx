import { supabase } from "../lib/supabase";

type Props = {
  email: string;
};

export function HomeScreen({ email }: Props) {
  return (
    <section className="card">
      <h1>Tyr Auto Uploader</h1>
      <p className="lede">Signed in as {email}</p>
      <p className="muted">Replay watching and upload will go here.</p>
      <button
        className="cta ghost"
        type="button"
        onClick={() => supabase?.auth.signOut()}
      >
        Sign out
      </button>
    </section>
  );
}
