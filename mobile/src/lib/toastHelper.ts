import { useToast } from '@/components/Toast';

// These helpers need to be called from within a component that has access to the useToast hook
// Use this pattern in your component:
//
// const { showToast } = useToast();
// showToast('Meal entry deleted', 'success');
//
// Or use these exported functions directly:

export const getDeleteSuccessMessage = (itemType: string, itemName?: string) => {
  return itemName
    ? `${itemType} "${itemName}" deleted`
    : `${itemType} deleted`;
};

export const getClearSuccessMessage = (message: string) => {
  return message;
};
