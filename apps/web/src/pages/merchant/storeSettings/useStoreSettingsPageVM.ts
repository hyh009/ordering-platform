import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import deepEqual from 'fast-deep-equal';
import {
  toUpdateStoreRequest,
  fromStore,
} from '@/features/components/store/storeForm/storeFormMapper';
import { createStoreDetailRuntime } from '@/features/merchant/store/detail/runtime';
import { useStoreForm } from '@/features/components/store/storeForm/useStoreForm';
import { tDefault } from '@/app/i18n';
import { storeImageKinds, type StoreImageKind } from '@/models/asset';
import type { StoreStatus, UpdateStoreRequest } from '@/models/store';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createStoreSettingsPageCommands } from './storeSettingsPage.commands';

// A branding image's pending edit relative to the saved store:
// keep = untouched, replace = a new (already-cropped) file staged for upload on
// save, remove = clear the stored image. The tri-state matters because the save
// patch is partial: only replace/remove touch the profile, keep is omitted.
type ImageDraft =
  | { type: 'keep' }
  | { type: 'replace'; file: File }
  | { type: 'remove' };

const imageProfileField: Record<StoreImageKind, 'logoUrl' | 'bannerUrl'> = {
  logo: 'logoUrl',
  banner: 'bannerUrl',
};

function emptyImageDrafts(): Record<StoreImageKind, ImageDraft> {
  return { logo: { type: 'keep' }, banner: { type: 'keep' } };
}

// Object URL for a staged file preview, revoked when the file changes or the
// hook unmounts so we don't leak blobs.
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

// What the upload field should show: staged preview when replacing, nothing when
// removing, otherwise the saved image.
function resolveImageValue(
  draft: ImageDraft,
  savedUrl: string | undefined,
  previewUrl: string | null,
): string | undefined {
  if (draft.type === 'replace') return previewUrl ?? undefined;
  if (draft.type === 'remove') return undefined;
  return savedUrl;
}

export function useStoreSettingsPageVM() {
  const runtime = useMemo(() => createStoreDetailRuntime(), []);
  const commands = useMemo(
    () => createStoreSettingsPageCommands(runtime.actions),
    [runtime],
  );

  const storeId = useStore(activeStoreStore, (s) => s.storeId);
  const store = useStore(runtime.store, (s) => s.store);
  const isLoading = useStore(runtime.store, (s) => s.isLoading);
  const loadError = useStore(runtime.store, (s) => s.error);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  // Admins default to a read-only view and opt into editing. Staff never edit,
  // so this stays false for them.
  const [isEditing, setIsEditing] = useState(false);
  // Staged branding edits. Like the form fields, these are local until the user
  // saves: selecting/cropping a file or removing an image only updates a draft
  // here; the actual upload + persist happens in submit.
  const [imageDrafts, setImageDrafts] =
    useState<Record<StoreImageKind, ImageDraft>>(emptyImageDrafts);

  const canManage = useCanManageStoreResources();
  const form = useStoreForm();
  const { reset: resetForm } = form;

  const logoDraft = imageDrafts.logo;
  const bannerDraft = imageDrafts.banner;
  const logoPreview = useObjectUrl(
    logoDraft.type === 'replace' ? logoDraft.file : null,
  );
  const bannerPreview = useObjectUrl(
    bannerDraft.type === 'replace' ? bannerDraft.file : null,
  );

  const imageValues = useMemo(
    () => ({
      logo: resolveImageValue(logoDraft, store?.profile.logoUrl, logoPreview),
      banner: resolveImageValue(
        bannerDraft,
        store?.profile.bannerUrl,
        bannerPreview,
      ),
    }),
    [logoDraft, bannerDraft, store, logoPreview, bannerPreview],
  );

  const resetImageDrafts = useCallback(
    () => setImageDrafts(emptyImageDrafts()),
    [],
  );

  // savedValues: snapshot of form values at last successful load or save.
  // Derived from store so it stays in sync without a separate setState call.
  // Used as the diff baseline in submit and isDirty below.
  const savedValues = useMemo(() => (store ? fromStore(store) : null), [store]);

  const imagesDirty = useMemo(
    () => storeImageKinds.some((kind) => imageDrafts[kind].type !== 'keep'),
    [imageDrafts],
  );

  // isDirty: true when form.values diverge from savedValues, or a branding image
  // has a staged edit. Also intended for blocking navigation via useBlocker
  // (in-app) + beforeunload (tab close) — not wired up yet.
  const isDirty = useMemo(
    () =>
      imagesDirty ||
      (savedValues !== null && !deepEqual(savedValues, form.values)),
    [imagesDirty, savedValues, form.values],
  );

  useEffect(() => {
    if (!storeId) return;
    void commands.loadStore(storeId);
  }, [storeId, commands]);

  const retry = useCallback(() => {
    if (storeId) void commands.loadStore(storeId);
  }, [storeId, commands]);

  // Re-baseline the form whenever the saved store changes (initial load and
  // after each successful save). Branding drafts are reset at their own edit
  // boundaries (save success / cancel) rather than here.
  useEffect(() => {
    if (savedValues) resetForm(savedValues);
  }, [savedValues, resetForm]);

  const submit = useCallback(async () => {
    if (!storeId || !savedValues) return;

    form.setIsSubmitting(true);
    form.resetErrors();

    const patch = toUpdateStoreRequest(savedValues, form.values);

    // Upload any staged images first, then fold their URLs (or null for
    // removals) into one store update so the whole page saves atomically.
    const profilePatch: { logoUrl?: string | null; bannerUrl?: string | null } =
      {};
    for (const kind of storeImageKinds) {
      const draft = imageDrafts[kind];
      if (draft.type === 'keep') continue;
      if (draft.type === 'remove') {
        profilePatch[imageProfileField[kind]] = null;
        continue;
      }

      const uploaded = await commands.uploadStoreImage(
        storeId,
        kind,
        draft.file,
      );
      if (uploaded.status !== 'uploaded') {
        form.setIsSubmitting(false);
        handleMerchantFailure(uploaded);
        return;
      }
      profilePatch[imageProfileField[kind]] = uploaded.image.url;
    }

    const fullPatch: UpdateStoreRequest = { ...patch };
    if (Object.keys(profilePatch).length > 0) {
      fullPatch.profile = { ...patch.profile, ...profilePatch };
    }

    if (Object.keys(fullPatch).length === 0) {
      form.setIsSubmitting(false);
      return;
    }

    const result = await commands.updateStore(storeId, fullPatch);

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      resetImageDrafts();
      setIsEditing(false);
      feedbackCommands.toast({
        tone: 'success',
        message: tDefault(
          'merchant.storeSettings.savedSuccess',
          'Store settings saved.',
        ),
      });
      return;
    }

    handleMerchantFailure(result, {
      form: {
        setSubmitError: form.setSubmitError,
        setFieldErrors: form.setFieldErrors,
      },
    });
  }, [storeId, savedValues, form, commands, imageDrafts, resetImageDrafts]);

  const startEdit = useCallback(() => setIsEditing(true), []);

  // Discard in-flight edits by snapping the form and branding drafts back to the
  // saved snapshot, then leave edit mode.
  const cancelEdit = useCallback(() => {
    if (savedValues) resetForm(savedValues);
    resetImageDrafts();
    setIsEditing(false);
  }, [savedValues, resetForm, resetImageDrafts]);

  // Stage a cropped file for upload on save; the field handles validation/crop.
  const setImage = useCallback((kind: StoreImageKind, file: File) => {
    setImageDrafts((drafts) => ({ ...drafts, [kind]: { type: 'replace', file } }));
  }, []);

  // Mark a branding image for removal on save.
  const removeImage = useCallback((kind: StoreImageKind) => {
    setImageDrafts((drafts) => ({ ...drafts, [kind]: { type: 'remove' } }));
  }, []);

  const toggleStatus = useCallback(async () => {
    if (!storeId || !store) return;

    const newStatus: StoreStatus =
      store.status === 'active' ? 'disabled' : 'active';

    setIsStatusUpdating(true);
    const result = await commands.updateStore(storeId, { status: newStatus });
    setIsStatusUpdating(false);

    if (result.status === 'saved') {
      feedbackCommands.toast({
        tone: 'success',
        message: tDefault(
          'merchant.storeSettings.statusUpdated',
          'Store status updated.',
        ),
      });
      return;
    }

    handleMerchantFailure(result);
  }, [storeId, store, commands]);

  return {
    canManage,
    cancelEdit,
    form,
    imageValues,
    isDirty,
    isEditing,
    isLoading,
    isStatusUpdating,
    loadError,
    removeImage,
    retry,
    setImage,
    startEdit,
    store,
    submit,
    toggleStatus,
  };
}
