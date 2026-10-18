import { useState, type FormEvent } from 'react';
import { useEndpoints } from '../hooks/useEndpoints';
import { Button } from './ui/Button';
import { Input, Textarea, Label } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import type { Endpoint, EndpointDetail, RotateSecretResult } from '../types';
import { cn } from '../utils/cn';

export interface EndpointFormProps {
  /**
   * Mode: create a new endpoint or edit existing
   * @default 'create'
   */
  mode?: 'create' | 'edit';
  /**
   * Endpoint to edit (required when mode is 'edit')
   */
  endpoint?: Endpoint;
  /**
   * Callback when form submission succeeds, with the saved endpoint.
   * For create mode, also receives the signing secret
   */
  onSuccess?: (endpoint: EndpointDetail, secret?: string) => void;
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
  /**
   * Additional class name
   */
  className?: string;
}

export function EndpointForm({
  mode = 'create',
  endpoint,
  onSuccess,
  onCancel,
  className,
}: EndpointFormProps) {
  const { createEndpoint, updateEndpoint, isCreating, isUpdating } = useEndpoints();
  const [url, setUrl] = useState(endpoint?.url ?? '');
  const [description, setDescription] = useState(endpoint?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  // Show secret after creation
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const isSubmitting = isCreating || isUpdating;
  const isEdit = mode === 'edit';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    try {
      if (isEdit && endpoint) {
        const result = await updateEndpoint(endpoint.id, {
          url,
          // null clears it; undefined would leave the old description in place
          description: description.trim() ? description : null,
        });
        onSuccess?.(result.data);
      } else {
        const result = await createEndpoint({
          url,
          description: description || undefined,
        });
        setCreatedSecret(result.data.secret);
        onSuccess?.(result.data, result.data.secret);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save endpoint');
    }
  };

  // Show secret dialog after successful creation
  if (createdSecret) {
    return (
      <Dialog open onOpenChange={() => setCreatedSecret(null)}>
        <DialogContent className="hkb-secret-dialog">
          <DialogHeader>
            <DialogTitle>Endpoint Created</DialogTitle>
            <DialogDescription>
              Save this signing secret securely. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="hkb-secret-container">
            <Label>Signing Secret</Label>
            <div className="hkb-secret-value">
              <code>{createdSecret}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(createdSecret)}
              >
                Copy
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreatedSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={cn('hkb-endpoint-form', className)}>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Endpoint' : 'Create Endpoint'}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="hkb-form-field">
            <Label htmlFor="endpoint-url">Endpoint URL</Label>
            <Input
              id="endpoint-url"
              type="url"
              placeholder="https://your-app.com/webhooks"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={!!error}
              required
            />
          </div>

          <div className="hkb-form-field">
            <Label htmlFor="endpoint-description">Description (optional)</Label>
            <Textarea
              id="endpoint-description"
              placeholder="What is this endpoint for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="hkb-form-error">{error}</p>}
        </CardContent>

        <CardFooter>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
                ? 'Save'
                : 'Create Endpoint'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export interface EndpointSecretRotationProps {
  endpoint: Endpoint;
  /**
   * How long the old secret keeps verifying, in seconds (0-86400)
   * @default 86400 (the API's default)
   */
  gracePeriodSeconds?: number;
  onSuccess?: (newSecret: string, result: RotateSecretResult) => void;
  onCancel?: () => void;
}

export function EndpointSecretRotation({
  endpoint,
  gracePeriodSeconds,
  onSuccess,
  onCancel,
}: EndpointSecretRotationProps) {
  const { rotateSecret, isRotating } = useEndpoints();
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [previousSecretExpiresAt, setPreviousSecretExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRotate = async () => {
    setError(null);
    try {
      const result = await rotateSecret(
        endpoint.id,
        gracePeriodSeconds !== undefined ? { gracePeriodSeconds } : undefined
      );
      setNewSecret(result.data.secret);
      setPreviousSecretExpiresAt(result.data.previousSecretExpiresAt);
      onSuccess?.(result.data.secret, result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate secret');
    }
  };

  if (newSecret) {
    return (
      <Dialog open onOpenChange={() => setNewSecret(null)}>
        <DialogContent className="hkb-secret-dialog">
          <DialogHeader>
            <DialogTitle>Secret Rotated</DialogTitle>
            <DialogDescription>
              Your endpoint now has a new signing secret. Update your application
              with this new secret.
              {previousSecretExpiresAt &&
                new Date(previousSecretExpiresAt).getTime() > Date.now() &&
                ` The old secret keeps working until ${new Date(previousSecretExpiresAt).toLocaleString()}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="hkb-secret-container">
            <Label>New Signing Secret</Label>
            <div className="hkb-secret-value">
              <code>{newSecret}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(newSecret)}
              >
                Copy
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="hkb-secret-rotation">
      <CardHeader>
        <CardTitle>Rotate Signing Secret</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="hkb-text-muted">
          This will generate a new signing secret for this endpoint. You'll need
          to update your application with the new secret.
        </p>
        {error && <p className="hkb-form-error">{error}</p>}
      </CardContent>
      <CardFooter>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={handleRotate}
          disabled={isRotating}
        >
          {isRotating ? 'Rotating...' : 'Rotate Secret'}
        </Button>
      </CardFooter>
    </Card>
  );
}
