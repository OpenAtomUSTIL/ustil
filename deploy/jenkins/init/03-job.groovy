// 创建 ustil-deploy 流水线任务（幂等，每次启动执行）
// Pipeline from SCM：主仓库 OpenAtomUSTIL/ustil（含 deploy/ 的伞仓库），脚本路径 deploy/Jenkinsfile；
// 业务仓库 ustil-hub / ustil-front 由流水线 Checkout 阶段检出到同名兄弟目录。
import jenkins.model.Jenkins
import hudson.plugins.git.GitSCM
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.UserRemoteConfig
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import org.jenkinsci.plugins.workflow.job.WorkflowJob

def instance = Jenkins.getInstance()
if (instance.getItem('ustil-deploy') == null) {
    def repoUrl = System.getenv('USTIL_REPO_URL') ?: 'https://github.com/OpenAtomUSTIL/ustil.git'
    def remote = new UserRemoteConfig(repoUrl, null, null, 'ustil-git-credentials')
    def scm = new GitSCM([remote])
    scm.branches = [new BranchSpec('*/main')]
    def job = instance.createProject(WorkflowJob, 'ustil-deploy')
    job.setDefinition(new CpsScmFlowDefinition(scm, 'deploy/Jenkinsfile'))
    job.save()
    println('[init] job created: ustil-deploy')
}
