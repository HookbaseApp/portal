// Main exports for @hookbase/portal

// Provider and main wrapper
export { HookbasePortal, type HookbasePortalProps } from './context/HookbaseContext';

// Context hooks
export { useHookbase } from './hooks/useHookbase';
export { useTheme } from './context/ThemeContext';

// Data hooks
export { useEndpoints, useEndpoint } from './hooks/useEndpoints';
export { useEventTypes } from './hooks/useEventTypes';
export { useSubscriptions } from './hooks/useSubscriptions';
export { useMessages, useMessage, type UseMessagesOptions } from './hooks/useMessages';
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
  EndpointWithSecret,
  EventType,
  Subscription,
  OutboundMessage,
  Application,
  HookbaseTheme,
  CreateEndpointInput,
  UpdateEndpointInput,
  CreateSubscriptionInput,
  MessagesQuery,
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
