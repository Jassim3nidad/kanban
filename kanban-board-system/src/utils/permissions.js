import { supabase } from '../lib/supabaseClient.js';

// Resolve the current user's (or guest's) role for a given board.
// Checks board_members for registered users, falls back to
// shared_links token-based role for guests.
export async function getUserRole(boardId, userId, guestToken = null) {
  if (userId) {
    // 0. Check if user is an administrator
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!profileError && userProfile && userProfile.role === 'admin') {
      return 'owner';
    }

    // 1. Check if user is board owner
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('owner_id')
      .eq('board_id', boardId)
      .maybeSingle();

    if (!boardError && board && board.owner_id === userId) {
      return 'owner';
    }

    // 2. Check if user is board member
    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!memberError && member) {
      return member.role; // 'viewer' | 'editor' | 'owner'
    }
  }

  // 3. Fallback to guest token check if provided
  if (guestToken) {
    const { valid, permissionType } = await validateShareToken(guestToken);
    if (valid) {
      return permissionType; // 'viewer' | 'editor'
    }
  }

  return null;
}

// True if role is allowed to perform write actions
export function canEdit(role) {
  return role === 'owner' || role === 'editor';
}

// True if role can view board content
export function canView(role) {
  return ['owner', 'editor', 'viewer'].includes(role);
}

// Runtime guard — call before any create/edit/delete/move action
export function enforcePermission(role, action) {
  if (action === 'view') {
    if (!canView(role)) {
      throw new Error('Permission denied: Cannot view this board.');
    }
  } else {
    if (!canEdit(role)) {
      throw new Error('Permission denied: Write action not allowed for your role.');
    }
  }
}

// Validate a shared_links token against Supabase
// (checks is_active + expiry_date) for guest access
export async function validateShareToken(token) {
  if (!token) {
    return { valid: false, boardId: null, permissionType: null };
  }

  const { data, error } = await supabase
    .from('shared_links')
    .select('board_id, permission_type, is_active, expiry_date')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, boardId: null, permissionType: null };
  }

  const now = new Date();
  const isExpired = data.expiry_date && new Date(data.expiry_date) < now;
  const isValid = data.is_active && !isExpired;

  return {
    valid: isValid,
    boardId: data.board_id,
    permissionType: data.permission_type
  };
}
