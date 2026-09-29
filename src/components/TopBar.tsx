import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import astrolokalLogo from '@/assets/astrolokal-logo.png';

interface TopBarProps {
  micStatus?: 'active' | 'muted' | 'denied';
}

export const TopBar = ({}: TopBarProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-b border-border/20 z-50">
      <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-lg">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src={astrolokalLogo} 
            alt="AstroLokal" 
            className="h-8 w-auto"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Help dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
                <span className="sr-only">Help</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>How to use Astrolokal</DialogTitle>
                <DialogDescription className="space-y-4 pt-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Getting Started</h4>
                    <p className="text-sm">
                      Start chatting with Omkar, your astrologer, by typing your questions or concerns. You can ask about career, love, marriage, family, or any life guidance.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">What to Share</h4>
                    <p className="text-sm">
                      For accurate readings, share your birth details (date, time, and place) when asked. The more context you provide, the better the guidance.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Privacy</h4>
                    <p className="text-sm">
                      Your session data is used only to prepare your horoscope and provide guidance. We respect your privacy.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};
