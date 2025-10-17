export const inlineEditAnimations = {
  editRegion: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },

  contextDim: {
    initial: { opacity: 1, filter: 'blur(0px)' },
    animate: { opacity: 0.4, filter: 'blur(0.5px)' },
    exit: { opacity: 1, filter: 'blur(0px)' },
    transition: { duration: 0.2 }
  },

  toolbar: {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 10, opacity: 0 },
    transition: { duration: 0.15, delay: 0.05 }
  }
} as const;

export const inlineEditTransitions = {
  entry: 'transition-all duration-200 ease-out',
  contextDim: 'transition-all duration-300',
  toolbar: 'transition-all duration-150',
  saveSuccess: 'transition-all duration-300 ease-in-out'
} as const;

export const inlineEditClasses = {
  editRegion: 'animate-in fade-in slide-in-from-bottom-2 duration-200',
  contextDim: 'opacity-40 blur-[0.5px] transition-all duration-300',
  toolbar: 'animate-in slide-in-from-bottom-2 fade-in duration-150'
} as const;
