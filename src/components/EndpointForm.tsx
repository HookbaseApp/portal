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
import { useTranslation } from '../context/I18nContext';

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
  const { t } = useTranslation();
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
      setError(t('form.invalidUrl'));
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
      setError(err instanceof Error ? err.message : t('form.saveFailed'));
    }
  };

  // Show secret dialog after successful creation
  if (createdSecret) {
    return (
      <Dialog open onOpenChange={() => setCreatedSecret(null)}>
        <DialogContent className="hkb-secret-dialog">
          <DialogHeader>
            <DialogTitle>{t('form.createdTitle')}</DialogTitle>
            <DialogDescription>
              {t('form.createdDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="hkb-secret-container">
            <Label>{t('form.signingSecret')}</Label>
            <div className="hkb-secret-value">
              <code>{createdSecret}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(createdSecret)}
              >
                {t('common.copy')}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreatedSecret(null)}>{t('common.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={cn('hkb-endpoint-form', className)}>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEdit ? t('form.editTitle') : t('form.createTitle')}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="hkb-form-field">
            <Label htmlFor="endpoint-url">{t('form.urlLabel')}</Label>
            <Input
              id="endpoint-url"
              type="url"
              placeholder={t('form.urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={!!error}
              required
            />
          </div>

          <div className="hkb-form-field">
            <Label htmlFor="endpoint-description">{t('form.descriptionLabel')}</Label>
            <Textarea
              id="endpoint-description"
              placeholder={t('form.descriptionPlaceholder')}
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
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? t('form.saving')
                : t('form.creating')
              : isEdit
                ? t('form.save')
                : t('form.create')}
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
  const { t, formatDate } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('rotate.failed'));
    }
  };

  if (newSecret) {
    return (
      <Dialog open onOpenChange={() => setNewSecret(null)}>
        <DialogContent className="hkb-secret-dialog">
          <DialogHeader>
            <DialogTitle>{t('rotate.rotatedTitle')}</DialogTitle>
            <DialogDescription>
              {t('rotate.rotatedDescription')}
              {previousSecretExpiresAt &&
                new Date(previousSecretExpiresAt).getTime() > Date.now() &&
                ` ${t('rotate.oldSecretUntil', { date: formatDate(previousSecretExpiresAt) })}`}
            </DialogDescription>
          </DialogHeader>

          <div className="hkb-secret-container">
            <Label>{t('rotate.newSecret')}</Label>
            <div className="hkb-secret-value">
              <code>{newSecret}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(newSecret)}
              >
                {t('common.copy')}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>{t('common.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="hkb-secret-rotation">
      <CardHeader>
        <CardTitle>{t('rotate.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="hkb-text-muted">
          {t('rotate.description')}
        </p>
        {error && <p className="hkb-form-error">{error}</p>}
      </CardContent>
      <CardFooter>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={handleRotate}
          disabled={isRotating}
        >
          {isRotating ? t('rotate.rotating') : t('rotate.submit')}
        </Button>
      </CardFooter>
    </Card>
  );
}
