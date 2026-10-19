// Main exports for @hookbase/portal

// Provider and main wrapper
export {
  HookbasePortal,
  useBranding,
  type HookbasePortalProps,
  type BrandingContextValue,
} from './context/HookbaseContext';

// Context hooks
export { useHookbase } from './hooks/useHookbase';
export { useTheme } from './context/ThemeContext';
export { useTranslation, type TranslationValue } from './context/I18nContext';

// Branding
export {
  DEFAULT_BRANDING,
  brandingToTheme,
  sanitizeBranding,
  isPortalBranding,
  hexToHslTriplet,
  type PortalBranding,
  type BrandingCssVariables,
  type BrandingCssVariable,
} from './branding';

// i18n
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  CATALOGS,
  resolveLocale,
  matchLocale,
  createTranslator,
  type PortalLocale,
  type PortalMessages,
  type PortalMessageKey,
  type Translate,
} from './i18n';

// Data hooks
export { useEndpoints, useEndpoint } from './hooks/useEndpoints';
export { useEventTypes } from './hooks/useEventTypes';
export { useSubscriptions } from './hooks/useSubscriptions';
export { useMessages, useMessage, useMessageAttempts, type UseMessagesOptions } from './hooks/useMessages';
export { useApplication } from './hooks/useApplication';
export { useTestEndpoint } from './hooks/useTestEndpoint';
export { useReplay } from './hooks/useReplay';

// Components
export {
  EndpointList,
  type EndpointListProps,
} from './components/EndpointList';
export {
  EndpointForm,
  EndpointSecretRotation,
  type EndpointFormProps,
  type EndpointSecretRotationProps,
} from './components/EndpointForm';
export {
  EventTypeList,
  type EventTypeListProps,
} from './components/EventTypeList';
export {
  SubscriptionManager,
  type SubscriptionManagerProps,
} from './components/SubscriptionManager';
export {
  MessageLog,
  type MessageLogProps,
} from './components/MessageLog';
export {
  PortalBrandHeader,
  PoweredBy,
  type PortalBrandHeaderProps,
  type PoweredByProps,
} from './components/Branding';

// UI Primitives (for advanced customization)
export {
  Button,
  type ButtonProps,
  Badge,
  type BadgeProps,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  type DialogProps,
  Input,
  Textarea,
  Label,
  type InputProps,
  type TextareaProps,
  Skeleton,
  SkeletonText,
  type SkeletonProps,
  Checkbox,
  type CheckboxProps,
  Switch,
  type SwitchProps,
} from './components/ui';

// Types
export type {
  Endpoint,
  EndpointDetail,
  EndpointWithSecret,
  CircuitState,
  SuccessStatusCode,
  BackoffType,
  EventType,
  Subscription,
  OutboundMessage,
  OutboundMessageDetail,
  MessageStatus,
  MessageAttempt,
  Application,
  HookbaseTheme,
  CreateEndpointInput,
  UpdateEndpointInput,
  CreateSubscriptionInput,
  RotateSecretInput,
  RotateSecretResult,
  MessagesQuery,
  Pagination,
  PaginatedResponse,
  ApiResponse,
  TestDeliveryResult,
  ReplayResult,
  BulkReplayResult,
  VerifyResult,
} from './types';

// API Client (for advanced use cases)
export { PortalApiClient, PortalApiError } from './api/client';

// Utilities
export { cn } from './utils/cn';
