import {
  Group,
  getGroupById,
  getGroups,
  getTotalOwed,
  getUnpaidCount,
  subscribeToGroups,
  updateGroup,
  upsertGroup,
} from './splitItData';

const NETWORK_DELAY_MS = 350;

function wait(duration = NETWORK_DELAY_MS) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

export async function fetchGroups() {
  await wait();
  return getGroups();
}

export async function fetchGroupById(groupId?: string) {
  await wait();
  return getGroupById(groupId);
}

export async function fetchHomeSummary() {
  await wait();
  return {
    totalOwed: getTotalOwed(),
    unpaidCount: getUnpaidCount(),
  };
}

export async function createOrUpdateGroup(group: Group) {
  await wait();
  return upsertGroup(group);
}

export async function patchGroup(groupId: string, updater: (group: Group) => Group) {
  await wait();
  return updateGroup(groupId, updater);
}

export function onGroupsChanged(callback: () => void) {
  return subscribeToGroups(callback);
}
