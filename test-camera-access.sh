#!/bin/bash

echo "🧪 Testing Camera Stream Accessibility"
echo "====================================="

LOCAL_IP="192.168.1.110"

# Test each camera stream
echo "📹 Testing camera streams..."

echo -n "Front Camera (8082): "
if timeout 3 curl -s "http://$LOCAL_IP:8082/stream" >/dev/null; then
    echo "✅ ACCESSIBLE"
else
    echo "❌ NOT ACCESSIBLE"
fi

echo -n "Back Camera (8081): "
if timeout 3 curl -s "http://$LOCAL_IP:8081/stream" >/dev/null; then
    echo "✅ ACCESSIBLE"
else
    echo "❌ NOT ACCESSIBLE"
fi

echo -n "Left Camera (8084): "
if timeout 3 curl -s "http://$LOCAL_IP:8084/stream" >/dev/null; then
    echo "✅ ACCESSIBLE"
else
    echo "❌ NOT ACCESSIBLE"
fi

echo -n "Right Camera (8083): "
if timeout 3 curl -s "http://$LOCAL_IP:8083/stream" >/dev/null; then
    echo "✅ ACCESSIBLE"
else
    echo "❌ NOT ACCESSIBLE"
fi

echo ""
echo "🌐 Network Binding Test:"
echo "Checking if servers are bound to 0.0.0.0 (all interfaces)..."
ss -tulpn | grep -E ":808[1-4]" | while read line; do
    echo "  $line"
done

echo ""
echo "🔥 Firewall Status:"
sudo ufw status | grep -E "(8080|8081|8082|8083)"

echo ""
echo "💡 For external access from another laptop:"
echo "   Try: http://$LOCAL_IP:8082/stream (Front Camera)"
echo "   Try: http://$LOCAL_IP:8081/stream (Back Camera)" 
echo "   Try: http://$LOCAL_IP:8084/stream (Left Camera)"
echo "   Try: http://$LOCAL_IP:8083/stream (Right Camera)"
