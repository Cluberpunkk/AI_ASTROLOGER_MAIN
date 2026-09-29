import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import astrologerAvatar from '@/assets/astrologer-omkar.png';

interface AstrologerProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const specialties = [
  { label: 'Career', emoji: '💼' },
  { label: 'Love & Relationships', emoji: '❤️' },
  { label: 'Marriage', emoji: '💍' },
  { label: 'Finance', emoji: '💰' },
  { label: 'Daily Guidance', emoji: '🌟' },
];

export const AstrologerProfile = ({ open, onOpenChange }: AstrologerProfileProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-4">
            {/* Large Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
              <img
                src={astrologerAvatar}
                alt="Omkar"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name and Title */}
            <div>
              <SheetTitle className="text-2xl flex items-center justify-center gap-2">
                <span>Omkar</span>
                <span>🕉️</span>
              </SheetTitle>
              <p className="text-muted-foreground mt-1">
                आपका Personal Vedic Astrologer
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Description */}
        <div className="mt-6 space-y-6">
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">
              Main aapki life ke sawalon ka jawaab dene ke liye yahan hoon - 
              career, love, marriage, ya life ki koi bhi confusion. 
              Batao kya chal raha hai, main sun raha hoon. 🙏
            </p>
          </div>

          {/* Specialties */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Expertise Areas
            </h3>
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <Badge 
                  key={specialty.label}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm"
                >
                  <span className="mr-1.5">{specialty.emoji}</span>
                  {specialty.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Response Time</span>
              <span className="text-foreground">Usually instant</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Language</span>
              <span className="text-foreground">Hinglish</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Style</span>
              <span className="text-foreground">Friendly & Personal</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
