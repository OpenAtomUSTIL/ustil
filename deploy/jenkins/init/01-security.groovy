// 初始化安全域与管理员账号（幂等，每次启动执行）
// 账号：admin / 密码：INITIAL_ADMIN_PASSWORD 环境变量，缺失则随机生成并写入
// ${JENKINS_HOME}/initial-admin-password.txt
import jenkins.model.Jenkins
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.model.User

def instance = Jenkins.getInstance()

def realm = instance.getSecurityRealm()
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
    realm = new HudsonPrivateSecurityRealm(false)
    instance.setSecurityRealm(realm)
    println('[init] security realm: HudsonPrivateSecurityRealm')
}

if (User.getById('admin', false) == null) {
    def password = System.getenv('INITIAL_ADMIN_PASSWORD')
    if (password == null || password.trim().isEmpty()) {
        password = java.util.UUID.randomUUID().toString().replace('-', '').take(16)
        new File(instance.getRootDir(), 'initial-admin-password.txt').setText(password + '\n', 'UTF-8')
        println('[init] admin password 已随机生成，见 JENKINS_HOME/initial-admin-password.txt')
    }
    realm.createAccount('admin', password)
    println('[init] account created: admin')
}

def strategy = instance.getAuthorizationStrategy()
if (!(strategy instanceof FullControlOnceLoggedInAuthorizationStrategy)) {
    def s = new FullControlOnceLoggedInAuthorizationStrategy()
    s.setAllowAnonymousRead(false)
    instance.setAuthorizationStrategy(s)
    println('[init] authorization: FullControlOnceLoggedIn（匿名不可读）')
}

instance.save()
