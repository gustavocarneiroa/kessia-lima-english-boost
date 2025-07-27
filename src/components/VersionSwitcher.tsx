import { useVersion } from '@/contexts/VersionContext';
import { Button } from '@/components/ui/button';

const VersionSwitcher = () => {
  const { version, setVersion } = useVersion();

  return (
    <div className="fixed top-4 left-4 z-50 bg-background border border-border rounded-lg p-2 shadow-lg" style={{zIndex: 99999 }}>
      <div className="flex gap-2">
        <Button
          variant={version === '1.0' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setVersion('1.0')}
        >
          v1.0
        </Button>
        <Button
          variant={version === '1.1' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setVersion('1.1')}
        >
          v1.1
        </Button>
      </div>
    </div>
  );
};

export default VersionSwitcher;