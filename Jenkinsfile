// CI automatic pipeline validation - CTI/AEB
node {
    stage('SCM') {
        checkout scm
    }

    stage('SonarQube Analysis') {
        def scannerHome = tool 'SonarScanner-8.0.1.6346'
        withSonarQubeEnv('SonarQube') {
            withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                sh """
                    ${scannerHome}/bin/sonar-scanner \
                        -Dsonar.login=${SONAR_TOKEN}
                """
            }
        }
    }

    stage('Quality Gate') {
        timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
    }

    stage('Deploy') {
        sh """
            rsync -az --delete \
                --exclude='.git/' \
                --exclude='.scannerwork/' \
                --exclude='.env' \
                -e "ssh -i /var/lib/jenkins/.ssh/id_rsa -o StrictHostKeyChecking=no" \
                ./ root@${VM_HOST}:${VM_PATH}/

            ssh -i /var/lib/jenkins/.ssh/id_rsa \
                -o StrictHostKeyChecking=no \
                root@${VM_HOST} '
                    cd ${VM_PATH} &&
                    docker compose up -d --build
                '
        """
    }
}