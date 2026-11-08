import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSegmentation,
  evaluateQualityControl,
  getNextAgentNode,
} from './orchestrator_logic';

test('calculateSegmentation handles 30-minute epic with 5-second segments', () => {
  const result = calculateSegmentation(1800, 5);
  assert.equal(result.totalScenes, 360);
  assert.equal(result.clips.length, 360);
  assert.equal(result.clips[0].start, 0);
  assert.equal(result.clips[0].end, 5);
  assert.equal(result.clips[359].end, 1800);
});

test('calculateSegmentation handles 15-second standard preview', () => {
  const result = calculateSegmentation(15, 5);
  assert.equal(result.totalScenes, 3);
  assert.equal(result.clips.length, 3);
  assert.equal(result.clips[2].end, 15);
});

test('evaluateQualityControl passes when all clips present and duration matches', () => {
  const scenes = [
    { scene_id: 's1', scene_index: 1, duration: 5.0, status: 'completed', video_clip_url: '/v1.mp4' },
    { scene_id: 's2', scene_index: 2, duration: 5.0, status: 'completed', video_clip_url: '/v2.mp4' },
    { scene_id: 's3', scene_index: 3, duration: 5.0, status: 'completed', video_clip_url: '/v3.mp4' },
  ];
  const qc = evaluateQualityControl(scenes, 15.0);
  assert.equal(qc.passed, true);
  assert.equal(qc.missing_scene_indices.length, 0);
  assert.equal(qc.defective_scene_ids.length, 0);
  assert.equal(qc.total_video_duration, 15.0);
});

test('evaluateQualityControl detects missing clips and flags defective scene IDs', () => {
  const scenes = [
    { scene_id: 's1', scene_index: 1, duration: 5.0, status: 'completed', video_clip_url: '/v1.mp4' },
    { scene_id: 's2', scene_index: 2, duration: 5.0, status: 'failed', video_clip_url: null },
  ];
  const qc = evaluateQualityControl(scenes, 10.0);
  assert.equal(qc.passed, false);
  assert.equal(qc.missing_scene_indices.length, 1);
  assert.equal(qc.missing_scene_indices[0], 2);
  assert.equal(qc.defective_scene_ids.includes('s2'), true);
});

test('getNextAgentNode routes autonomously when mode is autonomous', () => {
  const step = getNextAgentNode('scene_planner', 'autonomous', 0, true, 0);
  assert.equal(step.nextNode, 'video_agent');
  assert.equal(step.shouldPause, false);
});

test('getNextAgentNode pauses for human review when mode is review and unapproved scenes exist', () => {
  const step = getNextAgentNode('scene_planner', 'review', 2, true, 0);
  assert.equal(step.nextNode, 'scene_planner');
  assert.equal(step.shouldPause, true);
});

test('getNextAgentNode loops back to video_agent if QC failed and retries remain', () => {
  const step = getNextAgentNode('qc_agent', 'autonomous', 0, false, 1);
  assert.equal(step.nextNode, 'video_agent');
  assert.equal(step.shouldPause, false);
});
