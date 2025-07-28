import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Version = '1.0' | '1.1';

interface VersionContextType {
  version: Version;
  setVersion: (version: Version) => void;
  showHidden: boolean;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider = ({ children }: { children: ReactNode }) => {
  const [version, setVersion] = useState<Version>('1.1');
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const versionParam = urlParams.get('version') as Version;
    const showHiddenParam = urlParams.get('showHidden');
    
    if (versionParam === '1.0' || versionParam === '1.1') {
      setVersion(versionParam);
    }
    
    setShowHidden(showHiddenParam === '1');
  }, []);

  return (
    <VersionContext.Provider value={{ version, setVersion, showHidden }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};