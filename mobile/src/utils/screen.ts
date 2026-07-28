export const IMAGE_SIZES = {
  admin: {
    thumbnail: 'w-28 h-28',
    thumbnailRounded: 'rounded-xl',
    listImage: 'w-28 h-28',
    listImageRounded: 'rounded-xl',
    avatar: 'w-16 h-16',
    avatarRounded: 'rounded-full',
    uploadPreview: 'w-40 h-40',
    uploadPreviewRounded: 'rounded-2xl',
    categoryPicker: 'w-20 h-20',
    categoryPickerRounded: 'rounded-2xl',
    categoryThumb: 'w-20 h-20',
    categoryThumbRounded: 'rounded-xl',
    cardImage: 'aspect-[4/5]',
  },
  customer: {
    productCard: 'aspect-[4/5]',
    categoryCircle: 'w-24 h-24',
    favoriteCard: 'w-36 h-36',
  },
} as const;

export const IMAGE_CONTAINER_CLASSES = {
  admin: {
    thumbnail: `${IMAGE_SIZES.admin.thumbnail} ${IMAGE_SIZES.admin.thumbnailRounded} bg-[#FAFAFA] overflow-hidden`,
    listImage: `${IMAGE_SIZES.admin.listImage} ${IMAGE_SIZES.admin.listImageRounded} bg-[#FAFAFA] overflow-hidden`,
    categoryPicker: `${IMAGE_SIZES.admin.categoryPicker} ${IMAGE_SIZES.admin.categoryPickerRounded} bg-slate-50 overflow-hidden`,
    categoryThumb: `${IMAGE_SIZES.admin.categoryThumb} ${IMAGE_SIZES.admin.categoryThumbRounded} bg-slate-50 overflow-hidden`,
    uploadPreview: `${IMAGE_SIZES.admin.uploadPreview} ${IMAGE_SIZES.admin.uploadPreviewRounded} bg-slate-100`,
  },
} as const;
