import Head from "next/head";

export default function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <>
      <Head>
        <title>Quizapp Status</title>
      </Head>
      <main style={styles.main}>
        <h1 style={styles.title}>Quizapp Backend</h1>
        <p style={styles.text}>Vercel deployment is connected.</p>
        <p style={styles.text}>
          Supabase URL configured: {supabaseUrl ? "yes" : "no"}
        </p>
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "2rem"
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "1rem"
  },
  text: {
    fontSize: "1rem"
  }
};

