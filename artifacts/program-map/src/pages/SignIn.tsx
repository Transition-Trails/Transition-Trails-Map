import { SignIn } from '@clerk/react';
import { Map } from 'lucide-react';

const APPEARANCE = {
  cssLayerName: 'clerk' as const,
  variables: {
    colorPrimary:         'hsl(145, 40%, 32%)',
    colorForeground:      'hsl(220, 15%, 22%)',
    colorMutedForeground: 'hsl(220, 12%, 45%)',
    colorDanger:          'hsl(0, 72%, 51%)',
    colorBackground:      'hsl(40, 30%, 96%)',
    colorInput:           'hsl(0, 0%, 100%)',
    colorInputForeground: 'hsl(220, 15%, 22%)',
    colorNeutral:         'hsl(38, 20%, 84%)',
    fontFamily:           'Inter, sans-serif',
    borderRadius:         '0.5rem',
  },
  elements: {
    rootBox:              'w-full flex justify-center',
    cardBox:              'bg-white rounded-2xl w-[420px] max-w-full overflow-hidden shadow-xl border border-stone-200',
    card:                 '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer:               '!shadow-none !bg-stone-50 !border-t !border-stone-200 !rounded-none',
    headerTitle:          '!text-[20px] !font-semibold !leading-tight',
    headerSubtitle:       '!text-[14px]',
    socialButtonsBlockButton:     '!border !border-stone-200 !bg-white hover:!bg-stone-50 !rounded-lg !transition-colors',
    socialButtonsBlockButtonText: '!text-[14px] !font-medium',
    formButtonPrimary:    '!rounded-lg !font-medium !transition-colors',
    formFieldLabel:       '!text-[14px] !font-medium',
    formFieldInput:       '!border-stone-200 !bg-white !rounded-lg',
    footerActionLink:     '!font-medium',
    dividerText:          '!text-[14px]',
    logoBox:              '!hidden',
  },
};

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <div className="min-h-screen bg-[hsl(40_30%_94%)] flex flex-col">
      {/* Top bar */}
      <div className="h-[52px] border-b bg-card flex items-center px-5 gap-3 flex-shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
          <Map className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold text-foreground leading-none">Trail OS</span>
        <span className="text-muted-foreground/30 select-none">·</span>
        <span className="text-sm text-muted-foreground font-medium">Transition Trails</span>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-8">
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Sign in to Trail OS</h1>
          <p className="text-sm text-muted-foreground">Internal platform · Transition Trails Academy</p>
        </div>

        <SignIn
          appearance={APPEARANCE}
          routing="path"
          path={`${basePath}/sign-in`}
        />

        <div className="flex items-center gap-2 text-[14px] text-muted-foreground/60">
          <svg className="w-3 h-3 text-muted-foreground/40" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          <span>@transitiontrails.org accounts only</span>
        </div>
      </div>
    </div>
  );
}
