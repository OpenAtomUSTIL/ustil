// 创建流水线所需凭据（幂等，每次启动执行）
// 真实值经启动环境变量注入（--env-file），缺失时用占位值——Jenkinsfile 的
// environment.credentials(...) 绑定要求凭据条目必须存在，否则任务直接失败。
import jenkins.model.Jenkins
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import com.cloudbees.plugins.credentials.CredentialsScope

def env = System.getenv()
def store = Jenkins.getInstance().getExtensionList(SystemCredentialsProvider)[0].getStore()

def add = { String id, String desc, String user, String pass ->
    def exists = store.getCredentials(Domain.global()).any { it.id == id }
    if (!exists) {
        store.addCredentials(Domain.global(), new UsernamePasswordCredentialsImpl(
            CredentialsScope.GLOBAL, id, desc, user, pass))
        println("[init] credential created: ${id}")
    }
}

add('ustil-git-credentials', 'GitHub 访问令牌（拉取 ustil / ustil-hub / ustil-front）',
    env['GIT_USERNAME'] ?: 'git', env['GIT_TOKEN'] ?: 'placeholder-git-token')
add('ustil-registry-account', '镜像仓库账号（PUSH_IMAGES=true 时使用）',
    env['REGISTRY_USERNAME'] ?: 'registry', env['REGISTRY_PASSWORD'] ?: 'placeholder-registry-pass')
add('ustil-postgres-password', 'PostgreSQL 密码（部署栈）',
    'postgres', env['POSTGRES_PASSWORD'] ?: 'change-me-placeholder')
add('ustil-jwt-access-secret', 'JWT access 密钥（>=16 字符）',
    'jwt', env['JWT_ACCESS_SECRET'] ?: 'placeholder-access-secret-000')
add('ustil-jwt-refresh-secret', 'JWT refresh 密钥（>=16 字符）',
    'jwt', env['JWT_REFRESH_SECRET'] ?: 'placeholder-refresh-secret-00')
add('ustil-r2-access-key-id', 'R2 AccessKey（后续接入 B2/R2 时替换）',
    'r2', env['R2_ACCESS_KEY_ID'] ?: 'placeholder-r2-key-id')
add('ustil-r2-secret-access-key', 'R2 SecretKey（后续接入时替换）',
    'r2', env['R2_SECRET_ACCESS_KEY'] ?: 'placeholder-r2-secret-key')

store.save()
