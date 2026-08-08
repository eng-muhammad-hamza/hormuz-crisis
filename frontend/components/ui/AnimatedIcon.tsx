'use client';

import React from 'react';
import {
  BellIcon,
  TriangleAlertIcon,
  ShieldIcon,
  NavigationIcon,
  CompassIcon,
  AnchorIcon,
  TargetIcon,
  ActivityIcon,
  RadioIcon,
  FlameIcon,
  ZapIcon,
  WindIcon,
  EyeIcon,
  LayersIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Volume2Icon,
  VolumeXIcon,
  SunIcon,
  MoonIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  HeartPulseIcon,
  LockIcon,
  SendIcon,
  TerminalIcon,
  CpuIcon,
  DatabaseIcon,
  LifeBuoyIcon,
  FilterIcon,
  MapPinIcon,
} from '@animateicons/react/lucide';

export type IconName =
  | 'bell'
  | 'alert'
  | 'shield'
  | 'navigation'
  | 'compass'
  | 'anchor'
  | 'target'
  | 'radar'
  | 'activity'
  | 'radio'
  | 'fuel'
  | 'zap'
  | 'wind'
  | 'eye'
  | 'layers'
  | 'search'
  | 'sliders'
  | 'filter'
  | 'volume'
  | 'mute'
  | 'sun'
  | 'moon'
  | 'play'
  | 'pause'
  | 'refresh'
  | 'check'
  | 'close'
  | 'chevron-down'
  | 'chevron-up'
  | 'arrow-right'
  | 'arrow-left'
  | 'heart-pulse'
  | 'lock'
  | 'send'
  | 'terminal'
  | 'cpu'
  | 'database'
  | 'lifebuoy'
  | 'map-pin';

interface AnimatedIconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  isAnimated?: boolean;
}

export function AnimatedIcon({
  name,
  size = 18,
  color,
  className = '',
  isAnimated = false,
}: AnimatedIconProps) {
  const commonProps = {
    size,
    color,
    className,
    isAnimated,
  };

  switch (name) {
    case 'bell':
      return <BellIcon {...commonProps} />;
    case 'alert':
      return <TriangleAlertIcon {...commonProps} />;
    case 'shield':
      return <ShieldIcon {...commonProps} />;
    case 'navigation':
      return <NavigationIcon {...commonProps} />;
    case 'compass':
      return <CompassIcon {...commonProps} />;
    case 'anchor':
      return <AnchorIcon {...commonProps} />;
    case 'target':
    case 'radar':
      return <TargetIcon {...commonProps} />;
    case 'activity':
      return <ActivityIcon {...commonProps} />;
    case 'radio':
      return <RadioIcon {...commonProps} />;
    case 'fuel':
      return <FlameIcon {...commonProps} />;
    case 'zap':
      return <ZapIcon {...commonProps} />;
    case 'wind':
      return <WindIcon {...commonProps} />;
    case 'eye':
      return <EyeIcon {...commonProps} />;
    case 'layers':
      return <LayersIcon {...commonProps} />;
    case 'search':
      return <SearchIcon {...commonProps} />;
    case 'sliders':
      return <SlidersHorizontalIcon {...commonProps} />;
    case 'filter':
      return <FilterIcon {...commonProps} />;
    case 'volume':
      return <Volume2Icon {...commonProps} />;
    case 'mute':
      return <VolumeXIcon {...commonProps} />;
    case 'sun':
      return <SunIcon {...commonProps} />;
    case 'moon':
      return <MoonIcon {...commonProps} />;
    case 'play':
      return <PlayIcon {...commonProps} />;
    case 'pause':
      return <PauseIcon {...commonProps} />;
    case 'refresh':
      return <RefreshCwIcon {...commonProps} />;
    case 'check':
      return <CheckIcon {...commonProps} />;
    case 'close':
      return <XIcon {...commonProps} />;
    case 'chevron-down':
      return <ChevronDownIcon {...commonProps} />;
    case 'chevron-up':
      return <ChevronUpIcon {...commonProps} />;
    case 'arrow-right':
      return <ArrowRightIcon {...commonProps} />;
    case 'arrow-left':
      return <ArrowLeftIcon {...commonProps} />;
    case 'heart-pulse':
      return <HeartPulseIcon {...commonProps} />;
    case 'lock':
      return <LockIcon {...commonProps} />;
    case 'send':
      return <SendIcon {...commonProps} />;
    case 'terminal':
      return <TerminalIcon {...commonProps} />;
    case 'cpu':
      return <CpuIcon {...commonProps} />;
    case 'database':
      return <DatabaseIcon {...commonProps} />;
    case 'lifebuoy':
      return <LifeBuoyIcon {...commonProps} />;
    case 'map-pin':
      return <MapPinIcon {...commonProps} />;
    default:
      return <ActivityIcon {...commonProps} />;
  }
}
