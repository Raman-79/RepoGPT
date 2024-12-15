export interface Repository {
    id: number;
    name: string;
    html_url: string;
    owner:{
      login:string
    }
  }

export interface TypewriterProps {
    text: string;
    delay: number;
}

export interface GithubResponse {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string | null;
    encoding:string | null;
    content: string | null;
    type: 'file' | 'dir';

    _links: {
        self: string;
        git: string;
        html: string;
    };
}

export interface FilesAndContent {
    name: string;
    content: string;
}

export interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export type CodeReview = {
    code_review: Array<{
      file_name: string;
      current_functionality: string;
      code_quality: {
        strengths: string[];
        weaknesses: string[];
      };
      complexity_score: number; // Range: 1-10
    }>;
    possible_changes: Array<{
      file_name: string;
      recommended_refactoring: string[];
      potential_performance_improvements: string[];
      code_structure_suggestions: string[];
    }>;
    enhancements: Array<{
      category: "UI" | "UX" | "Functionality" | "Architecture";
      suggestions: string[];
      potential_impact: "Low" | "Medium" | "High";
    }>;
    overall_project_insights: {
      main_observations: string[];
      key_recommendations: string[];
    };
  };
  