import { Frame, Toast } from "@shopify/polaris";
import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface ToastContextType {
  showToast: (message: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const showToast = useCallback((msg: string, error = false) => {
    setMessage(msg);
    setIsError(error);
    setActive(true);
  }, []);

  const toggleActive = useCallback(() => setActive((active) => !active), []);

  const toastMarkup = active ? (
    <Toast content={message} error={isError} onDismiss={toggleActive} />
  ) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Frame>
        {children}
        {toastMarkup}
      </Frame>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
