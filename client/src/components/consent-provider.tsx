import { ReactNode } from "react";
import ConsentDialog from "./consent-dialog";

interface ConsentProviderProps {
  children: ReactNode;
}

export function ConsentProvider({ children }: ConsentProviderProps) {
  return (
    <>
      {children}
      <ConsentDialog />
    </>
  );
}