import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import logoMark from "@/assets/logo.svg";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground"
    >
      <img src={logoMark} alt="RetinaScan AI" className="size-12 rounded-xl shadow-sm" />
      <div className="nb-border nb-pop bg-card px-8 py-6 text-center">
        <h1 className="nb-mono text-5xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is not part of the screening pipeline.
        </p>
      </div>
      <Button
        type="button"
        onClick={() => navigate("/")}
        className="nb-pop-hover cursor-pointer rounded-none border-2 font-semibold"
      >
        Back to home
      </Button>
    </motion.div>
  );
}
