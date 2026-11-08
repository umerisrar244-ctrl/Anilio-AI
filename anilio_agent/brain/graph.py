"""
LangGraph Workflow Graph for Anilio Brain.
Orchestrates:
User Prompt -> Story Agent -> Character Agent -> Background Agent -> Voice Agent 
-> Scene Planner -> Video Agent (Wan 2.2) -> Quality Control Agent -> Editing Agent -> Final MP4
Includes conditional routing for Autonomous mode vs Review mode and QC retry cycles.
"""
from typing import Dict, Any, Literal
from agents.story_agent import StoryAgent
from agents.character_agent import CharacterAgent
from agents.background_agent import BackgroundAgent
from agents.voice_agent import VoiceAgent
from agents.video_agent import VideoAgent
from agents.qc_agent import QualityControlAgent
from agents.editing_agent import EditingAgent

story_agent = StoryAgent()
character_agent = CharacterAgent()
background_agent = BackgroundAgent()
voice_agent = VoiceAgent()
video_agent = VideoAgent()
qc_agent = QualityControlAgent()
editing_agent = EditingAgent()

# LangGraph Node Handlers
async def node_story_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await story_agent.execute(state)

async def node_character_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await character_agent.execute(state)

async def node_background_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await background_agent.execute(state)

async def node_voice_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await voice_agent.execute(state)

async def node_scene_planner(state: Dict[str, Any]) -> Dict[str, Any]:
    # Synthesizes inputs into Wan 2.2 ready scene specifications
    scenes = state.get("scenes", [])
    logs = state.get("logs", [])
    logs.append({
        "agent": "ScenePlanner",
        "action": "plan_finalized",
        "message": f"Scene Planner compiled camera, prompt, and asset parameters for {len(scenes)} clips.",
        "timestamp": "now"
    })
    return {
        "current_agent": "ScenePlanner",
        "current_step": "scene_specs_ready",
        "progress_percentage": 55,
        "logs": logs
    }

async def node_video_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await video_agent.execute(state)

async def node_qc_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await qc_agent.execute(state)

async def node_editing_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    return await editing_agent.execute(state)

# Conditional Edge Evaluators
def check_review_mode(state: Dict[str, Any]) -> Literal["video_generation", "await_approval"]:
    mode = state.get("mode", "autonomous")
    if mode == "review":
        scenes = state.get("scenes", [])
        unapproved = [s for s in scenes if not s.get("approved_by_user", False)]
        if unapproved:
            return "await_approval"
    return "video_generation"

def evaluate_qc_results(state: Dict[str, Any]) -> Literal["editing", "retry_scenes", "fail_job"]:
    qc = state.get("qc_report", {})
    if qc.get("passed", False):
        return "editing"
    
    retry_count = state.get("retry_count", 0)
    if retry_count < 3:
        return "retry_scenes"
    return "fail_job"

def build_anilio_brain_graph():
    """
    Constructs and compiles the complete LangGraph StateGraph.
    Can be loaded directly with LangGraph or run via standard async dispatch.
    """
    try:
        from langgraph.graph import StateGraph, END
        from brain.state import AnilioBrainState
        
        workflow = StateGraph(AnilioBrainState)
        
        # Add Nodes
        workflow.add_node("story_agent", node_story_agent)
        workflow.add_node("character_agent", node_character_agent)
        workflow.add_node("background_agent", node_background_agent)
        workflow.add_node("voice_agent", node_voice_agent)
        workflow.add_node("scene_planner", node_scene_planner)
        workflow.add_node("video_agent", node_video_agent)
        workflow.add_node("qc_agent", node_qc_agent)
        workflow.add_node("editing_agent", node_editing_agent)
        
        # Edges
        workflow.set_entry_point("story_agent")
        workflow.add_edge("story_agent", "character_agent")
        workflow.add_edge("character_agent", "background_agent")
        workflow.add_edge("background_agent", "voice_agent")
        workflow.add_edge("voice_agent", "scene_planner")
        
        # Conditional Edge: Autonomous vs Review mode
        workflow.add_conditional_edges(
            "scene_planner",
            check_review_mode,
            {
                "video_generation": "video_agent",
                "await_approval": END
            }
        )
        
        workflow.add_edge("video_agent", "qc_agent")
        
        # Conditional Edge: QC Evaluation (Pass -> Editing, Fail -> Retry Video, Exceeded -> END)
        workflow.add_conditional_edges(
            "qc_agent",
            evaluate_qc_results,
            {
                "editing": "editing_agent",
                "retry_scenes": "video_agent",
                "fail_job": END
            }
        )
        
        workflow.add_edge("editing_agent", END)
        return workflow.compile()
    except ImportError:
        return None
