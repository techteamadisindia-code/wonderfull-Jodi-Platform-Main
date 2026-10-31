export type DiwaliEffect =
  | 'auto'
  | 'petals'
  | 'diyas'
  | 'sparkles'
  | 'fireworks'
  | 'off';

export interface DiwaliEffectOption {
  id: DiwaliEffect;
  label: string;
  description: string;
  iconName: string;
}

export const DIWALI_EFFECT_OPTIONS: DiwaliEffectOption[] = [
  {
    id: 'auto',
    label: 'Auto (Gentle)',
    description: 'Sequentially cycles gentle festive accents with calm pauses',
    iconName: 'Sparkles',
  },
  {
    id: 'petals',
    label: 'Floating Flower Petals',
    description: 'Delicate marigold and rose petals drifting along margins',
    iconName: 'Flower2',
  },
  {
    id: 'diyas',
    label: 'Glowing Diyas',
    description: 'Warm traditional oil lamps radiating soft light at outer edges',
    iconName: 'Flame',
  },
  {
    id: 'sparkles',
    label: 'Golden Sparkles',
    description: 'Subtle twinkling golden starlight across the header banner',
    iconName: 'Star',
  },
  {
    id: 'fireworks',
    label: 'Subtle Fireworks',
    description: 'Soft micro-bursts of celebratory light in upper skies',
    iconName: 'PartyPopper',
  },
  {
    id: 'off',
    label: 'Off',
    description: 'Standard homepage view with festive animations disabled',
    iconName: 'EyeOff',
  },
];
