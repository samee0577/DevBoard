import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGateway } from "../projects/lib/gateway";
import { projectKeys } from "../projects/lib/queryKeys";
import useDialog from "../projects/hooks/useDialog";
import "../../index.css";

// Guest mode indicator. A small persistent pill in the header rather than a banner,
// because the mode never goes away and the explanation only needs reading once.
// Clicking it opens the full explanation plus the secondary reset action.
function GuestBadge({ onReset }: { onReset: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      // Return focus to the trigger so keyboard users are not stranded.
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="guestBadge-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={buttonRef}
        className="guestBadge"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        Guest
      </button>

      {isOpen && (
        <div className="guestPopover" role="dialog" aria-label="Guest mode">
          <div className="guestPopover-head">
            <span className="guestPopover-title">Sample workspace</span>
            <button
              type="button"
              className="guestPopover-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close guest mode details"
            >
              &times;
            </button>
          </div>
          <p className="guestPopover-text">
            You&apos;re exploring without an account. Editing works normally, but your
            changes are saved only in this browser &mdash; nothing is sent to the
            database.
          </p>
          <button
            type="button"
            className="guestPopover-reset"
            onClick={() => {
              onReset();
              setIsOpen(false);
            }}
          >
            Reset demo
          </button>
        </div>
      )}
    </div>
  );
}

// Nav for the guest sandbox. Mirrors the real NavBar minus sign-out, with the
// "new project" action locked so a guest sees the affordance without ever reaching
// a create route.
export default function DemoNavbar({ onReset }: { onReset: () => void }) {
  const gateway = useGateway();
  const navigate = useNavigate();
  const { dialogRef, openDialog, closeDialog } = useDialog();

  const { data: projects, isLoading } = useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => gateway.listProjects(),
  });

  return (
    <nav>
      <div className="nav-brand">
        <h1>DEVBOARD</h1>
        <GuestBadge onReset={onReset} />
      </div>
      <div className="nav-links">
        <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
          <Link className="buttonStyle" to="/demo/dashboard">Dashboard</Link>
          <button
            type="button"
            className="buttonStyle lockedButton"
            onClick={openDialog}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">🔒</span> + New Project
          </button>
        </div>
        <div>
          <button
            className="buttonStyle nav-cta"
            type="button"
            onClick={() => navigate("/")}
          >
            Sign up to save
          </button>
        </div>
      </div>
      {isLoading ? (
        <span>Total Projects: <span className="skeleton-badge"></span></span>
      ) : (
        <span>Total Projects: {projects?.length || 0}</span>
      )}

      <dialog ref={dialogRef} className="popup" onClose={closeDialog}>
        <h2>Sign up to create your own project</h2>
        <p className="popupText">
          You&apos;re in guest mode, so this is a sample workspace. Your edits here are
          real but stay in this browser &mdash; create an account to build your own
          projects and keep them safe.
        </p>
        <div className="popup-actions">
          <button
            type="button"
            className="popup-btn-primary"
            onClick={() => navigate("/")}
          >
            Sign up free
          </button>
          <button type="button" className="popup-btn-secondary" onClick={closeDialog}>
            Keep exploring
          </button>
        </div>
      </dialog>
    </nav>
  );
}